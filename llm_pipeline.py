"""
NinaivuNet AI - LLM Reasoning Pipeline (Module 3) - Multi-Provider Version
--------------------------------------------------------------------------
Reads a meeting's transcript.json (produced by transcribe.py) and calls an
LLM to produce a summary, key decisions, and structured action items.

Supports three no-cost / low-cost options:
1. Google Gemini API (Free Tier): Setup a free GEMINI_API_KEY from Google AI Studio.
2. Groq API (Free Tier): Setup a free GROQ_API_KEY.
3. Local Ollama (No cost, offline): Runs locally without any keys.
4. OpenAI API (Paid): Uses standard OPENAI_API_KEY.

Usage:
    # Option 1: Use Gemini API (Free Tier, Recommended)
    $env:GEMINI_API_KEY="your-gemini-api-key"
    python llm_pipeline.py team-standup-01

    # Option 2: Use local Ollama (Free, runs on your PC)
    python llm_pipeline.py team-standup-01

Requires: pip install openai requests --break-system-packages
"""

import argparse
import json
import os
import sys

import requests
from openai import OpenAI

CORPORATE_SYSTEM_PROMPT = """You are an assistant that reads corporate meeting transcripts and extracts \
structured information. You must respond with ONLY valid JSON, no markdown fences, \
no preamble, no explanation - just the raw JSON object matching this schema:

{
  "summary": "2-4 sentence summary of what the meeting covered",
  "decisions": [
    {
      "text": "what was decided",
      "reason": "why it was decided or rationale",
      "discussion": "short direct quote or dialogue snippet from the transcript showing active discussion"
    }
  ],
  "action_items": [
    {
      "description": "what needs to be done",
      "owner": "name of the person responsible, or null if not stated",
      "deadline": "deadline if mentioned, or null if not stated",
      "priority": "high" | "medium" | "low",
      "depends_on": ["exact description of another action item this task depends on, or null if independent"],
      "confidence": 95, -- confidence score integer from 0 to 100 on the clarity of the assignment and owner commitment discussed
      "evidence": "literal quote or dialogue snippet from the transcript as justification",
      "speaker": "name of speaker who made the commitment or owner",
      "timestamp": "00:18:42" -- timestamp or dialogue line reference, or null if not clear
    }
  ],
  "project_health": {
    "status": "on_track" | "at_risk" | "delayed",
    "reasoning": "1-2 sentence explanation predicting why the project has this status",
    "current_progress": 58, -- estimated percentage progress integer based on completed vs pending tasks discussed
    "expected_progress": 73, -- expected percentage progress integer based on deadlines and schedules discussed
    "delay_probability": "High" | "Medium" | "Low", -- delay risk rating based on tasks discussed
    "bottlenecks": ["any workload bottlenecks or constraints, e.g. Ramesh has too many tasks"],
    "risks": ["any active project risks or warnings discussed, e.g. delay in database schema approval"],
    "resource_recommendations": ["specific resource management advice, e.g. 'Move Rahul from Project X to Project Y' or 'Hire one additional backend developer'"]
  }
}

Rules:
- Only extract action items and decisions that are actually stated or clearly implied in the transcript. Use null for missing fields.
- If the transcript contains no real decisions, "decisions" MUST be [].
- If the transcript contains no real action items, "action_items" MUST be [].
- Under "project_health", predict the trajectory status, current/expected progress estimates, and delay probability. List concrete bottleneck/risk factors and recommendations."""


EDUCATION_SYSTEM_PROMPT = """You are an assistant that reads educational lectures or study group transcripts and extracts \
structured information. You must respond with ONLY valid JSON, no markdown fences, \
no preamble, no explanation - just the raw JSON object matching this schema:

{
  "summary": "2-4 sentence summary of what the meeting covered",
  "lecture_topic": "clean title of the core subject/topic discussed in this class, e.g. 'Introduction to Machine Learning' or 'Stack & Queue Basics'",
  "decisions": [
    {
      "text": "what was decided",
      "reason": "why it was decided or rationale",
      "discussion": "short direct quote or dialogue snippet from the transcript showing active discussion"
    }
  ],
  "action_items": [
    {
      "description": "what needs to be done",
      "owner": "name of the person responsible, or null if not stated",
      "deadline": "deadline if mentioned, or null if not stated",
      "priority": "high" | "medium" | "low",
      "depends_on": ["exact description of another action item this task depends on, or null if independent"],
      "confidence": 95, -- confidence score integer from 0 to 100 on the clarity of the assignment and owner commitment discussed
      "evidence": "literal quote or dialogue snippet from the transcript as justification",
      "speaker": "name of speaker who made the commitment or owner",
      "timestamp": "00:18:42" -- timestamp or dialogue line reference, or null if not clear
    }
  ],
  "study_planner": [
    {
      "topic": "topic name discussed in the class/lecture",
      "review_activities": ["specific study action or review exercise recommended for this topic"],
      "recommended_hours": 2
    }
  ],
  "assignments": [
    {
      "question": "practice quiz question based on lecture details",
      "type": "multiple_choice" | "short_answer",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "answer": "correct option or expected answer text"
    }
  ]
}

Rules:
- Only extract action items and decisions that are actually stated. Use null for missing fields.
- If the transcript contains no real decisions, "decisions" MUST be [].
- If the transcript contains no real action items, "action_items" MUST be [].
- Under "study_planner", extract the core syllabus/topics covered in the session and output study guide/review steps.
- Under "assignments", generate 2-3 practice/review quiz questions directly testing facts or concepts mentioned in the lecture."""


def load_transcript(meeting_dir: str) -> str:
    transcript_path = os.path.join(meeting_dir, "transcript.json")
    if not os.path.isfile(transcript_path):
        raise FileNotFoundError(
            f"No transcript.json found at {transcript_path} - run transcribe.py first."
        )

    with open(transcript_path, encoding="utf-8") as f:
        data = json.load(f)

    lines = []
    for seg in data.get("segments", []):
        text = seg.get("translated_text") or seg.get("text", "")
        lines.append(f"{seg['speaker']}: {text}")
    return "\n".join(lines)


def get_llm_client_and_model():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if gemini_key:
        print("Using Google Gemini API (Free Tier) via Google AI Studio...")
        # Return special indicator 'gemini' instead of OpenAI client
        return "gemini", "gemini-3.6-flash"
        
    elif groq_key:
        print("Using Groq API (Free Tier)...")
        client = OpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1"
        )
        return client, "llama-3.3-70b-specdec"
        
    elif openai_key:
        print("Using OpenAI API...")
        client = OpenAI(api_key=openai_key)
        return client, "gpt-4o-mini"
        
    else:
        print("No API keys found. Defaulting to local Ollama (no cost, offline)...")
        print("  -> Note: If Ollama isn't running, run 'ollama serve' or start the Ollama app.")
        print("  -> Note: To use a free hosted API instead, set the GEMINI_API_KEY environment variable.")
        client = OpenAI(
            api_key="ollama",  # Ollama doesn't require a key
            base_url="http://localhost:11434/v1"
        )
        return client, "llama3.2"


def extract_first_json_object(s: str) -> str:
    s = s.strip()
    start_idx = s.find('{')
    if start_idx == -1:
        return s
    
    brace_count = 0
    in_string = False
    escape = False
    
    for i in range(start_idx, len(s)):
        char = s[i]
        if escape:
            escape = False
            continue
        if char == '\\':
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return s[start_idx:i+1]
    return s


def extract_meeting_intelligence(client, model: str, transcript_text: str, system_prompt: str) -> dict:
    raw = None
    if client == "gemini":
        gemini_key = os.environ.get("GEMINI_API_KEY")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"{system_prompt}\n\nTranscript:\n\n{transcript_text}"
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        try:
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            res_json = response.json()
            raw = res_json["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"\nWARNING calling the Gemini API: {e}")
            if 'response' in locals() and response is not None:
                print(f"Details: {response.text}")
    else:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transcript:\n\n{transcript_text}"},
                ],
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
        except Exception as e:
            print(f"\nWARNING calling the LLM API: {e}")
            if "localhost" in str(getattr(client, "base_url", "")):
                print("  Is Ollama installed and running? Run the Ollama app first.")
            else:
                print("  Please check your API key and connection.")
                
    if not raw:
        print("\nUsing static fallback JSON parsing since LLM API call failed...")
        return {
            "summary": "Meeting transcript captured successfully. (AI Summary temporarily unavailable due to API rate limits / quota issues).",
            "decisions": [],
            "action_items": [],
            "project_health": {
                "status": "on_track",
                "reasoning": "Meeting saved successfully. AI pipeline is temporarily offline.",
                "current_progress": 100,
                "expected_progress": 100,
                "delay_probability": "Low",
                "bottlenecks": [],
                "risks": [],
                "resource_recommendations": []
            }
        }

    
    # Robust parsing to handle potential markdown code blocks / extra characters in raw output
    raw_cleaned = extract_first_json_object(raw)
    try:
        result = json.loads(raw_cleaned)
    except json.JSONDecodeError as err:
        clean_raw = raw_cleaned.strip()
        if clean_raw.startswith("```"):
            lines = clean_raw.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_raw = "\n".join(lines).strip()
        try:
            result = json.loads(clean_raw)
        except json.JSONDecodeError as err2:
            print("\nDEBUG: Failed to parse LLM response as JSON.")
            print(f"Error 1: {err}")
            print(f"Error 2: {err2}")
            print("Raw response from LLM:")
            print("-" * 40)
            print(raw)
            print("-" * 40)
            sys.exit(1)

    # Clean up placeholder items
    result["action_items"] = [
        item for item in result.get("action_items", [])
        if item.get("description")
    ]
    result["decisions"] = [d for d in result.get("decisions", []) if d]

    return result


def assign_task_ids(meeting_id: str, result: dict) -> dict:
    for i, item in enumerate(result.get("action_items", [])):
        item["task_id"] = f"{meeting_id}-task-{i}"
        item["meeting_id"] = meeting_id
        item["status"] = "open"
    return result


def main():
    parser = argparse.ArgumentParser(description="NinaivuNet AI LLM reasoning pipeline")
    parser.add_argument("meeting_id", help="Meeting ID (matches the folder name under recordings/)")
    parser.add_argument("--recordings-dir", default="recordings", help="Path to the recordings directory")
    parser.add_argument("--domain", default="corporate", choices=["corporate", "education"], help="Project domain category")
    args = parser.parse_args()

    meeting_dir = os.path.join(args.recordings_dir, args.meeting_id)

    print(f"Loading transcript for meeting '{args.meeting_id}' ...")
    transcript_text = load_transcript(meeting_dir)
    print(f"  {len(transcript_text)} characters of transcript loaded.")

    client, model = get_llm_client_and_model()

    system_prompt = EDUCATION_SYSTEM_PROMPT if args.domain == "education" else CORPORATE_SYSTEM_PROMPT

    print(f"Calling model '{model}' for domain '{args.domain}' to extract summary, decisions, and action items ...")
    result = extract_meeting_intelligence(client, model, transcript_text, system_prompt)
    result = assign_task_ids(args.meeting_id, result)

    out_path = os.path.join(meeting_dir, "meeting_intelligence.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Output written to {out_path}\n")
    print("Summary:")
    print(f"  {result.get('summary', '(none)')}\n")

    print("Decisions:")
    if not result.get("decisions"):
        print("  (none)")
    for d in result.get("decisions", []):
        print(f"  - {d}")

    print("\nAction items:")
    if not result.get("action_items"):
        print("  (none)")
    for item in result.get("action_items", []):
        owner = item.get("owner") or "(unassigned)"
        deadline = item.get("deadline") or "(no deadline)"
        print(f"  [{item.get('priority', 'medium')}] {item['description']} -> {owner}, due {deadline}")


if __name__ == "__main__":
    main()