import json
import anthropic
from pathlib import Path

client = anthropic.Anthropic()
PROMPT = (Path(__file__).parent.parent / "prompts" / "context_parser_prompt.txt").read_text()

def run(transcript: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=PROMPT,
        messages=[{"role": "user", "content": f"TRANSCRIPT:\n{transcript}"}],
    )
    raw = response.content[0].text.strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        result = json.loads(raw[start:])

    confidence = result.get("confidence", 0.85)
    flags = []
    if confidence < 0.70:
        flags.append("low_confidence_parse")

    return {
        "output": result,
        "confidence": confidence,
        "reasoning": result.get("reasoning", "Speaker diarisation and topic segmentation complete."),
        "flags": flags,
        "next_action": "await_gate" if not flags else "escalate",
    }
