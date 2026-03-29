import json
import anthropic
from pathlib import Path

client = anthropic.Anthropic()
PROMPT = (Path(__file__).parent.parent / "prompts" / "watchdog_prompt.txt").read_text()

def run(decisions: dict, context: dict) -> dict:
    payload = {
        "decisions": decisions,
        "speaker_context": context.get("speakers", []),
        "transcript_segments": context.get("segments", []),
    }
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=PROMPT,
        messages=[{"role": "user", "content": f"PIPELINE STATE:\n{json.dumps(payload, indent=2)}"}],
    )
    raw = response.content[0].text.strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        result = json.loads(raw[start:])

    issues = result.get("issues", [])
    flags = [i["type"] for i in issues]
    needs_correction = any(i.get("severity") == "high" for i in issues)

    return {
        "output": result,
        "confidence": result.get("confidence", 0.88),
        "reasoning": result.get("reasoning", f"Watchdog reviewed {len(decisions.get('decisions', []))} decisions. Found {len(issues)} issues."),
        "flags": flags,
        "next_action": "self_correct" if needs_correction else "proceed",
        "feedback_for_agent2": result.get("feedback_for_agent2", ""),
    }
