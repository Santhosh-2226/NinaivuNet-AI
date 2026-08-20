"""
NinaivuNet AI - Transcription Pipeline (Module 2)
--------------------------------------------------
Reads per-participant recordings produced by the meeting app
(recordings/<meetingId>/<userId>/combined.webm + meta.json), runs
each one through Whisper, and merges every participant's segments
onto a single shared timeline using their recorded start times.

Output: a chronologically ordered, speaker-labeled transcript -
exactly the "time-stamped, speaker-attributed text" described in
Section 7 (Methodology, step 4) and the Transcripts table in
Section 10 (Database Design) of the dossier.

Usage:
    python transcribe.py <meetingId> [--model small] [--recordings-dir recordings]

Requires: pip install faster-whisper --break-system-packages
          ffmpeg must be installed and on PATH
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from faster_whisper import WhisperModel


def load_participants(meeting_dir: str):
    """Finds every participant folder with a combined.webm + meta.json."""
    participants = []
    if not os.path.isdir(meeting_dir):
        raise FileNotFoundError(f"No recordings found for this meeting: {meeting_dir}")

    for user_id in sorted(os.listdir(meeting_dir)):
        user_dir = os.path.join(meeting_dir, user_id)
        combined_path = os.path.join(user_dir, "combined.webm")
        meta_path = os.path.join(user_dir, "meta.json")

        if not os.path.isfile(combined_path):
            print(f"  [skip] {user_id}: no combined.webm (did they call finalize / leave the meeting?)")
            continue

        started_at_ms = None
        user_name = user_id
        if os.path.isfile(meta_path):
            with open(meta_path, encoding="utf-8") as f:
                meta = json.load(f)
                started_at_ms = meta.get("startedAtMs")
                user_name = meta.get("userName", user_id)
        else:
            print(f"  [warn] {user_id}: no meta.json, cannot align timeline precisely - assuming start at meeting's earliest known time")

        participants.append({
            "user_id": user_id,
            "user_name": user_name,
            "audio_path": combined_path,
            "started_at_ms": started_at_ms,
        })

    return participants


def transcribe_participant(model: WhisperModel, participant: dict, language: str = None, task: str = "transcribe"):
    """Runs Whisper on one participant's audio, returns list of segments
    with absolute (meeting-relative) start/end times in seconds."""
    print(f"  Transcribing {participant['user_name']} ({participant['audio_path']}) ...")

    segments, info = model.transcribe(
        participant["audio_path"],
        vad_filter=True,   # skips silence, reduces hallucination on empty audio
        beam_size=5,
        language=language,
        task=task,
    )

    base_ms = participant["started_at_ms"] or 0
    results = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        results.append({
            "speaker": participant["user_name"],
            "speaker_id": participant["user_id"],
            "text": text,
            "start_abs_ms": base_ms + int(seg.start * 1000),
            "end_abs_ms": base_ms + int(seg.end * 1000),
            "speaker_language": info.language,
            "language_probability": info.language_probability,
        })

    print(f"    -> {len(results)} segment(s), detected language: {info.language}")
    return results


def merge_transcripts(all_segments: list):
    """Merges every participant's segments into one chronological list."""
    return sorted(all_segments, key=lambda s: s["start_abs_ms"])


def format_readable_transcript(merged_segments: list, meeting_start_ms: int):
    lines = []
    for seg in merged_segments:
        offset_s = (seg["start_abs_ms"] - meeting_start_ms) / 1000
        mm = int(offset_s // 60)
        ss = int(offset_s % 60)
        lines.append(f"[{mm:02d}:{ss:02d}] {seg['speaker']}: {seg['text']}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="NinaivuNet AI transcription pipeline")
    parser.add_argument("meeting_id", help="Meeting ID (matches the folder name under recordings/)")
    parser.add_argument("--recordings-dir", default="recordings", help="Path to the recordings directory")
    parser.add_argument("--model", default="small", help="Whisper model size: tiny, base, small, medium, large-v3")
    parser.add_argument("--device", default="cpu", help="cpu or cuda")
    parser.add_argument("--language", default=None, help="Force Whisper language detection (e.g. en, te)")
    parser.add_argument("--task", default="transcribe", choices=["transcribe", "translate"], help="Whisper task: transcribe or translate")
    args = parser.parse_args()

    meeting_dir = os.path.join(args.recordings_dir, args.meeting_id)
    print(f"Loading participants for meeting '{args.meeting_id}' from {meeting_dir} ...")
    participants = load_participants(meeting_dir)

    if not participants:
        print("No finalized recordings found. Make sure participants clicked 'Leave' so combined.webm was created.")
        sys.exit(1)

    print(f"Found {len(participants)} participant(s): {[p['user_name'] for p in participants]}")

    print(f"Loading Whisper model '{args.model}' (this can take a while on first run) ...")
    model = WhisperModel(args.model, device=args.device, compute_type="int8")

    all_segments = []
    for p in participants:
        all_segments.extend(transcribe_participant(model, p, language=args.language, task=args.task))

    if not all_segments:
        print("No speech detected in any recording.")
        sys.exit(1)

    merged = merge_transcripts(all_segments)
    meeting_start_ms = min(s["start_abs_ms"] for s in merged)

    meeting_lang = "en"
    if merged:
        langs = [s.get("speaker_language") for s in merged if s.get("speaker_language")]
        if langs:
            meeting_lang = max(set(langs), key=langs.count)

    # Structured JSON output - maps directly onto the dossier's
    # Transcripts table (transcript_id, meeting_id, speaker, text, timestamp)
    out_json_path = os.path.join(meeting_dir, "transcript.json")
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "meeting_id": args.meeting_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "meeting_language": meeting_lang,
            "segments": [
                {
                    "transcript_id": f"{args.meeting_id}-{i}",
                    "meeting_id": args.meeting_id,
                    "speaker": seg["speaker"],
                    "speaker_id": seg["speaker_id"],
                    "text": seg["text"],
                    "timestamp_ms": seg["start_abs_ms"],
                    "speaker_language": seg.get("speaker_language", "en"),
                    "language_probability": seg.get("language_probability", 1.0),
                }
                for i, seg in enumerate(merged)
            ],
        }, f, indent=2, ensure_ascii=False)

    # Human-readable version for quick review
    out_txt_path = os.path.join(meeting_dir, "transcript.txt")
    with open(out_txt_path, "w", encoding="utf-8") as f:
        f.write(format_readable_transcript(merged, meeting_start_ms))

    print(f"\nDone.")
    print(f"  Structured transcript: {out_json_path}")
    print(f"  Readable transcript:   {out_txt_path}")


if __name__ == "__main__":
    main()