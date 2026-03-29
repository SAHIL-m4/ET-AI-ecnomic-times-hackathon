import json
import anthropic
from pathlib import Path

client = anthropic.Anthropic()
PROMPT = (Path(__file__).parent.parent / "prompts" / "task_architect_prompt.txt").read_text()

def run(decisions: dict) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=PROMPT,
        messages=[{"role": "user", "content": f"DECISIONS:\n{json.dumps(decisions, indent=2)}"}],
    )
    raw = response.content[0].text.strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        result = json.loads(raw[start:])

    tasks = result.get("tasks", [])
    at_risk = [t for t in tasks if not t.get("owner") or not t.get("due_date")]
    flags = [f"at_risk:{t['id']}" for t in at_risk]

    return {
        "output": result,
        "confidence": result.get("confidence", 0.90),
        "reasoning": result.get("reasoning", f"Created {len(tasks)} tasks from {len(decisions.get('decisions', []))} decisions."),
        "flags": flags,
        "next_action": "await_gate",
    }
