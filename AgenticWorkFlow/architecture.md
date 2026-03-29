# MeetMind — Architecture Document

## System Overview

MeetMind is a four-agent AI pipeline that autonomously processes meeting transcripts into structured tasks with a full auditable trail. Two human-in-the-loop approval gates ensure oversight at critical decision points. One automated self-correction loop resolves agent errors without human intervention.

```
Transcript Input
      |
  [Agent 1 — Context Parser]
      | speaker map + topic segments JSON
  [Gate 1 — Human Approval]
      |
  [Agent 2 — Decision Extractor] <--+
      | decisions with confidence     | self-correction
  [Agent 4 — Watchdog] -------------+
      | if all clear
  [Agent 3 — Task Architect]
      |
  [Gate 2 — Human Approval]
      |
  Task Board + Audit Trail (output)
```

---

## Agent Roles

### Agent 1 — Context Parser
- **Input:** Raw meeting transcript (text)
- **Output:** Speaker map + chronological topic segments (JSON)
- **Method:** Identifies speakers by name mentions and turn-taking patterns. Segments by semantic topic shift.
- **Confidence threshold:** If < 0.70, raises `low_confidence_parse` flag and triggers Gate 1 early with warning.
- **Self-corrects:** No

### Agent 2 — Decision Extractor
- **Input:** Topic segments + speaker map from Agent 1. Optionally: Watchdog feedback string on re-run.
- **Output:** Array of decisions with owner, deadline, confidence score, source turn reference
- **Method:** Scans for commitment signals (modal verbs, explicit agreements, deadline phrases). Cross-references earlier speaker turns for owner attribution.
- **Self-corrects:** Yes — re-runs with injected Watchdog feedback when triggered

### Agent 3 — Task Architect
- **Input:** Resolved decisions array from Agent 2
- **Output:** Structured task list with title, owner, due date, priority, at_risk flag
- **Method:** Converts each decision to an actionable task. Assigns priority by deadline proximity and stakeholder seniority signal. Flags tasks missing owner or deadline as `at_risk`.
- **Self-corrects:** No

### Agent 4 — Watchdog
- **Input:** All decisions from Agent 2 + full speaker context
- **Output:** Issue list with severity levels + feedback string for Agent 2 re-run
- **Method:** Checks for ambiguous ownership, vague deadlines, overloaded owners, SLA breach risk. Classifies issues as high / medium / low severity.
- **Self-corrects:** Triggers Agent 2 re-run when any high-severity issue found

---

## Agent Communication

All inter-agent communication is structured JSON passed in-process via the orchestrator. No message broker is required for this implementation.

```
Agent Output Schema (every agent):
{
  "output":      {},        // agent-specific payload
  "confidence":  0.0–1.0,  // self-reported confidence
  "reasoning":   "string", // natural language explanation
  "flags":       [],        // list of issue codes
  "next_action": "string"  // proceed | await_gate | self_correct | escalate
}
```

---

## Audit Trail

Every agent call writes one immutable entry to `audit_trail.json`:

```json
{
  "run_id":        "uuid",
  "agent":         "decision_extractor",
  "timestamp":     "2026-03-28T10:04:41Z",
  "input_summary": "string",
  "output":        {},
  "confidence":    0.87,
  "reasoning":     "Natural language explanation of decision made",
  "flags":         ["ambiguous_owner:d6"],
  "next_action":   "watchdog_check"
}
```

The frontend renders this as a live, explorable timeline. Every entry is clickable to reveal full reasoning.

---

## Human-in-the-Loop Gates

| Gate | Trigger | What human reviews | If approved |
|---|---|---|---|
| Gate 1 | After Agent 1 | Speaker map, topic segments | Agent 2 begins |
| Gate 2 | After Agent 3 | All tasks, at-risk flags, unresolved owners | Tasks pushed to board |

Gate decisions are logged in the audit trail with user ID and timestamp.

---

## Error Handling

| Error | Detection | Recovery |
|---|---|---|
| Ambiguous owner | Agent 2 confidence < 0.5 | Agent 4 triggers self-correction; Agent 2 re-runs with feedback |
| Missing deadline | Agent 4 pattern check | Task flagged `at_risk`; surfaced at Gate 2 |
| Agent API failure | Orchestrator timeout / non-200 | Retry 3x with exponential backoff; escalate to human if all fail |
| Low confidence parse | Agent 1 confidence < 0.70 | Gate 1 triggered early with warning |
| SLA breach risk | Agent 4 deadline analysis | Escalation flag in audit trail; surfaced at Gate 2 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent LLM | Anthropic Claude (claude-sonnet-4-6) |
| Backend | Python + FastAPI |
| Real-time streaming | Server-Sent Events (SSE) |
| Frontend | React 18 + Tailwind CSS |
| Audit storage | JSON file (audit_trail.json) |
| State | In-memory (orchestrator process) |
