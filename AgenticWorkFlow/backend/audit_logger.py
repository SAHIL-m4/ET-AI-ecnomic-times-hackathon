import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

LOG_FILE = Path(__file__).parent / "audit_trail.json"

def init_run() -> str:
    run_id = str(uuid.uuid4())
    if not LOG_FILE.exists():
        LOG_FILE.write_text(json.dumps([]))
    return run_id

def log_entry(run_id: str, agent: str, input_summary: str, output: dict,
              confidence: float, reasoning: str, flags: list[str], next_action: str) -> dict:
    entry = {
        "run_id": run_id,
        "agent": agent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "input_summary": input_summary,
        "output": output,
        "confidence": round(confidence, 3),
        "reasoning": reasoning,
        "flags": flags,
        "next_action": next_action,
    }
    entries = json.loads(LOG_FILE.read_text())
    entries.append(entry)
    LOG_FILE.write_text(json.dumps(entries, indent=2))
    return entry

def get_log() -> list[dict]:
    if not LOG_FILE.exists():
        return []
    return json.loads(LOG_FILE.read_text())
