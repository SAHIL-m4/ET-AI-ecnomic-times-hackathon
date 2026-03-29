import os
import json
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

load_dotenv()

from audit_logger import init_run, log_entry, get_log
from agents import context_parser, decision_extractor, task_architect, watchdog

app = FastAPI(title="MeetMind API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline_state = {}

class TranscriptInput(BaseModel):
    transcript: str

class GateDecision(BaseModel):
    run_id: str
    gate: int
    approved: bool

@app.post("/run")
async def start_pipeline(body: TranscriptInput):
    run_id = init_run()
    pipeline_state[run_id] = {
        "transcript": body.transcript,
        "stage": "agent1",
        "context": None,
        "decisions": None,
        "tasks": None,
        "gate1_approved": False,
        "gate2_approved": False,
    }
    asyncio.create_task(run_agent1(run_id))
    return {"run_id": run_id}

@app.get("/stream/{run_id}")
async def stream(run_id: str):
    async def event_gen():
        last = 0
        while True:
            log = get_log()
            entries = [e for e in log if e["run_id"] == run_id]
            for entry in entries[last:]:
                yield {"data": json.dumps(entry)}
                last += 1
            state = pipeline_state.get(run_id, {})
            if state.get("stage") == "done":
                yield {"data": json.dumps({"agent": "system", "next_action": "done"})}
                break
            await asyncio.sleep(0.5)
    return EventSourceResponse(event_gen())

@app.post("/gate")
async def gate_decision(body: GateDecision):
    state = pipeline_state.get(body.run_id)
    if not state:
        return {"error": "run_id not found"}
    if body.gate == 1 and body.approved:
        state["gate1_approved"] = True
        asyncio.create_task(run_agent2(body.run_id))
    elif body.gate == 2 and body.approved:
        state["gate2_approved"] = True
        state["stage"] = "done"
    return {"status": "ok"}

@app.get("/log/{run_id}")
async def get_run_log(run_id: str):
    return [e for e in get_log() if e["run_id"] == run_id]

@app.get("/tasks/{run_id}")
async def get_tasks(run_id: str):
    state = pipeline_state.get(run_id, {})
    return state.get("tasks", {})

async def run_agent1(run_id: str):
    state = pipeline_state[run_id]
    state["stage"] = "agent1"
    result = context_parser.run(state["transcript"])
    state["context"] = result["output"]
    log_entry(run_id, "context_parser", "Raw transcript",
              result["output"], result["confidence"],
              result["reasoning"], result["flags"], result["next_action"])
    state["stage"] = "gate1"

async def run_agent2(run_id: str, watchdog_feedback: str = ""):
    state = pipeline_state[run_id]
    state["stage"] = "agent2"
    result = decision_extractor.run(state["context"], watchdog_feedback)
    state["decisions"] = result["output"]
    log_entry(run_id, "decision_extractor",
              "Context + speaker map" + (" + watchdog feedback" if watchdog_feedback else ""),
              result["output"], result["confidence"],
              result["reasoning"], result["flags"], result["next_action"])
    await run_agent4(run_id)

async def run_agent4(run_id: str):
    state = pipeline_state[run_id]
    state["stage"] = "watchdog"
    result = watchdog.run(state["decisions"], state["context"])
    log_entry(run_id, "watchdog", "All decisions + context",
              result["output"], result["confidence"],
              result["reasoning"], result["flags"], result["next_action"])
    if result["next_action"] == "self_correct":
        log_entry(run_id, "system", "Watchdog triggered self-correction",
                  {"action": "re_running_agent2"}, 1.0,
                  "Confidence below threshold on ownership. Re-running Agent 2 with Watchdog feedback injected.",
                  ["self_correction_loop"], "self_correct")
        await run_agent2(run_id, result.get("feedback_for_agent2", ""))
    else:
        await run_agent3(run_id)

async def run_agent3(run_id: str):
    state = pipeline_state[run_id]
    state["stage"] = "agent3"
    result = task_architect.run(state["decisions"])
    state["tasks"] = result["output"]
    log_entry(run_id, "task_architect", "Resolved decisions",
              result["output"], result["confidence"],
              result["reasoning"], result["flags"], result["next_action"])
    state["stage"] = "gate2"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
