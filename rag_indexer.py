"""
NinaivuNet AI - RAG Indexer (Knowledge Base Builder)
------------------------------------------------------
Reads a meeting's transcript.json, calls Gemini text-embedding-004 to
produce a 768-dim vector for each transcript segment, and stores them
in the SQLite `embeddings` table via the NinaivuNet Node.js API.

This is called automatically by server.js after llm_pipeline.py completes.

Usage (manual):
    python rag_indexer.py <meetingId> [--recordings-dir recordings] [--project-id <slug>]

Requires:
    pip install requests python-dotenv
"""

import argparse
import json
import os
import sys
import sqlite3
import time
import uuid

import requests

# ---------------------------------------------------------------------------
# Load .env from the project root (same directory as this script)
# ---------------------------------------------------------------------------
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.isfile(_env_path):
    with open(_env_path, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())


# ---------------------------------------------------------------------------
# Cosine similarity helper (also used by rag_query.py)
# ---------------------------------------------------------------------------
def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ---------------------------------------------------------------------------
# Gemini Embedding API
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "gemini-embedding-001"


def embed_text(text: str, api_key: str) -> list[float]:
    """Call Gemini text-embedding-004 and return the float vector."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBEDDING_MODEL}:embedContent?key={api_key}"
    )
    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
    }
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def embed_texts_batch(texts: list[str], api_key: str) -> list[list[float]]:
    """Call Gemini gemini-embedding-001 batchEmbedContents and return list of float vectors."""
    if not texts:
        return []
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBEDDING_MODEL}:batchEmbedContents?key={api_key}"
    )
    requests_payload = []
    for text in texts:
        requests_payload.append({
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": text}]},
            "taskType": "RETRIEVAL_DOCUMENT",
        })
    payload = {"requests": requests_payload}
    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    embeddings_data = resp.json().get("embeddings", [])
    return [emb["values"] for emb in embeddings_data]


# ---------------------------------------------------------------------------
# SQLite helpers (direct access — no HTTP round-trip needed)
# ---------------------------------------------------------------------------
DB_PATH = os.path.join(os.path.dirname(__file__), "ninaivunet.db")


def clear_embeddings(conn: sqlite3.Connection, meeting_id: str):
    conn.execute("DELETE FROM embeddings WHERE meeting_id = ?", (meeting_id,))
    conn.commit()


def insert_embedding(conn: sqlite3.Connection, *, meeting_id, project_id, speaker, text, timestamp_ms, embedding):
    conn.execute(
        """INSERT INTO embeddings
               (meeting_id, project_id, speaker, text, timestamp_ms, embedding)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (meeting_id, project_id, speaker, text, timestamp_ms, json.dumps(embedding)),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # Force UTF-8 for console output to avoid cp1252/UnicodeEncodeError on Windows
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="NinaivuNet RAG Indexer")
    parser.add_argument("meeting_id", help="Meeting ID folder name under recordings/")
    parser.add_argument("--recordings-dir", default="recordings")
    parser.add_argument("--project-id", default=None, help="SQLite project slug (optional)")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[rag-indexer] [WARNING] GEMINI_API_KEY not set - skipping embedding. Set it in .env")
        sys.exit(0)  # non-fatal exit so main pipeline continues

    meeting_dir = os.path.join(args.recordings_dir, args.meeting_id)
    transcript_path = os.path.join(meeting_dir, "transcript.json")

    if not os.path.isfile(transcript_path):
        print(f"[rag-indexer] [WARNING] No transcript.json at {transcript_path} - skipping.")
        sys.exit(0)

    with open(transcript_path, encoding="utf-8") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    if not segments:
        print(f"[rag-indexer] No segments in transcript for '{args.meeting_id}' — nothing to index.")
        sys.exit(0)

    # Derive project_id from meeting_id if not supplied (e.g. "myproject_20240712" → "myproject")
    project_id = args.project_id
    if not project_id and "_" in args.meeting_id:
        project_id = args.meeting_id.split("_")[0]

    conn = sqlite3.connect(DB_PATH)

    # Create embeddings table if it doesn't exist yet (safety net)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id   TEXT NOT NULL,
            project_id   TEXT,
            speaker      TEXT,
            text         TEXT,
            timestamp_ms INTEGER,
            embedding    TEXT NOT NULL
        )
    """)
    conn.commit()

    print(f"[rag-indexer] Clearing old embeddings for '{args.meeting_id}' ...")
    clear_embeddings(conn, args.meeting_id)

    # Filter out empty segments
    valid_segments = []
    for i, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        if text:
            valid_segments.append(seg)

    print(f"[rag-indexer] Indexing {len(valid_segments)} valid segments in batches for '{args.meeting_id}' ...")
    batch_size = 50
    success = 0

    for start_idx in range(0, len(valid_segments), batch_size):
        batch = valid_segments[start_idx:start_idx+batch_size]
        texts_to_embed = [
            f"{seg.get('speaker', 'Unknown')}: {seg.get('translated_text') or seg.get('text', '').strip()}"
            for seg in batch
        ]

        try:
            vectors = embed_texts_batch(texts_to_embed, api_key)
            for seg, vec in zip(batch, vectors):
                insert_embedding(
                    conn,
                    meeting_id=args.meeting_id,
                    project_id=project_id,
                    speaker=seg.get("speaker", "Unknown"),
                    text=seg.get("text", "").strip(),
                    timestamp_ms=seg.get("timestamp_ms", 0),
                    embedding=vec,
                )
                success += 1
            # Rate limit buffer between batches
            time.sleep(0.5)
        except Exception as e:
            print(f"[rag-indexer] [WARNING] Failed to embed batch starting at {start_idx}: {e}")

    conn.close()
    print(f"[rag-indexer] [SUCCESS] Indexed {success}/{len(valid_segments)} segments for '{args.meeting_id}'.")


if __name__ == "__main__":
    main()
