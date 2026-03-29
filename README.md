# ET-AI-ecnomic-times-hackathon

Autonomous Meeting Intelligence Agent

> ET AI Hackathon 2026 · Problem Statement 2: Agentic AI for Autonomous Enterprise Workflows

It deploys a four-agent AI pipeline that takes a meeting transcript and autonomously extracts every decision, creates structured tasks, assigns owners, detects SLA risks — and produces a full auditable trail of every reasoning step. Humans stay in control at two approval gates; everything else runs itself.

 The Problem : 

Enterprise teams lose 3–5 hours per week per employee to manual meeting follow-up. Decisions get missed, owners are unclear, deadlines slip, and SLA breaches cost money. No one has time to chase every action item.

 The Solution

Transcript → Agent 1 (Parse) → [Gate 1] → Agent 2 (Decisions) → Agent 4 (Watchdog)
                                                    ↑ self-correct ↙
                                          → Agent 3 (Tasks) → [Gate 2] → Task Board + Audit Trail


## Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API key

### Backend

bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Add your ANTHROPIC_API_KEY to .env
python orchestrator.py


### Frontend

`bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Project Structure

```
 
├── README.md
├── .env.example
├── .gitignore
├── architecture.md
├── impact_model.md
│
├── backend/
│   ├── orchestrator.py          # Main pipeline runner + SSE server
│   ├── audit_logger.py          # Immutable audit trail writer
│   ├── requirements.txt
│   ├── agents/
│   │   ├── context_parser.py    # Agent 1 — speaker diarisation + topic chunking
│   │   ├── decision_extractor.py # Agent 2 — commitment + owner extraction
│   │   ├── task_architect.py    # Agent 3 — structured task creation
│   │   └── watchdog.py          # Agent 4 — risk detection + self-correction trigger
│   └── prompts/
│       ├── context_parser_prompt.txt
│       ├── decision_extractor_prompt.txt
│       ├── task_architect_prompt.txt
│       └── watchdog_prompt.txt
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── AuditTrail.jsx   # Live expandable reasoning log
│           ├── KanbanBoard.jsx  # Task board with risk flags
│           └── GateBanner.jsx   # Human approval gate UI
│
└── demo/
    ├── sample_transcript.txt    # Scripted transcript — triggers all agents + self-correction
    └── sample_output.json       # Expected audit trail output



 Agent Architecture

| Agent | Input | Output | Self-corrects? |
|---|---|---|---|
| 1 — Context parser | Raw transcript | Speaker map + topic segments JSON | No |
| 2 — Decision extractor | Topic segments | Decisions with confidence scores | Yes (on Watchdog feedback) |
| 3 — Task architect | Decisions array | Tasks with owner, priority, due date | No |
| 4 — Watchdog | All agent outputs | Risk flags + escalation actions | Triggers Agent 2 re-run |


 Audit Trail Schema

Every agent call writes one JSON entry:

json

{
  "run_id": "uuid",
  "agent": "decision_extractor",
  "timestamp": "2026-03-28T10:04:21Z",
  "confidence": 0.87,
  "reasoning": "Identified commitment via modal verb 'will' + deadline 'by Friday'. Owner: Priya (turn 14).",
  "flags": ["ambiguous_owner:task_3"],
  "next_action": "self_correct"
}


