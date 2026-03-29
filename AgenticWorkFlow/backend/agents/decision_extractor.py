import json
import anthropic
from pathlib import Path

client = anthropic.Anthropic()
PROMPT = (Path(__file__).parent.parent / "prompts" / "decision_extractor_prompt.txt").read_text()

def run(context: dict, watchdog_feedback: str = "") -> dict:
    user_msg = f"CONTEXT:\n{json.dumps(context, indent=2)}"
    if watchdog_feedback:
        user_msg += f"\n\nWATCHDOG FEEDBACK (self-correction pass):\n{watchdog_feedback}"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = response.content[0].text.strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        result = json.loads(raw[start:])

    decisions = result.get("decisions", [])
    ambiguous = [d for d in decisions if d.get("confidence", 1.0) < 0.5]
    flags = [f"ambiguous_owner:{d['id']}" for d in ambiguous]

    return {
        "output": result,
        "confidence": result.get("overall_confidence", 0.82),
        "reasoning": result.get("reasoning", "Decisions extracted from commitment signals."),
        "flags": flags,
        "next_action": "proceed" if not flags else "watchdog_check",
    }
