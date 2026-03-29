import { useState, useRef } from "react";
import AuditTrail from "./components/AuditTrail";
import KanbanBoard from "./components/KanbanBoard";
import GateBanner from "./components/GateBanner";

const API = "http://localhost:8000";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [runId, setRunId] = useState(null);
  const [stage, setStage] = useState("idle");
  const [auditEntries, setAuditEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [gate, setGate] = useState(null);
  const esRef = useRef(null);

  async function startPipeline() {
    setAuditEntries([]);
    setTasks([]);
    setGate(null);
    setStage("running");

    const res = await fetch(`${API}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const { run_id } = await res.json();
    setRunId(run_id);

    esRef.current = new EventSource(`${API}/stream/${run_id}`);
    esRef.current.onmessage = (e) => {
      const entry = JSON.parse(e.data);
      if (entry.next_action === "done") {
        esRef.current.close();
        setStage("done");
        return;
      }
      if (entry.agent === "context_parser" && entry.next_action === "await_gate") {
        setGate(1);
      }
      if (entry.agent === "task_architect") {
        fetch(`${API}/tasks/${run_id}`).then(r => r.json()).then(setTasks);
        setGate(2);
      }
      setAuditEntries(prev => [...prev, entry]);
    };
  }

  async function approveGate(gateNum) {
    setGate(null);
    await fetch(`${API}/gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, gate: gateNum, approved: true }),
    });
  }

  function loadDemo() {
    fetch("/sample_transcript.txt").then(r => r.text()).then(setTranscript);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-medium text-gray-900">MeetMind</h1>
          <p className="text-sm text-gray-500 mt-1">Autonomous meeting intelligence — ET AI Hackathon 2026</p>
        </div>

        {stage === "idle" && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Paste meeting transcript</label>
              <button onClick={loadDemo} className="text-xs text-blue-600 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50">
                Load demo transcript
              </button>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 h-48 resize-none focus:outline-none focus:border-blue-400"
              placeholder="Paste your meeting transcript here..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
            <button
              onClick={startPipeline}
              disabled={!transcript.trim()}
              className="mt-3 bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Run MeetMind
            </button>
          </div>
        )}

        {gate && (
          <GateBanner gate={gate} onApprove={() => approveGate(gate)} />
        )}

        {auditEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <AuditTrail entries={auditEntries} />
            <div className="flex flex-col gap-4">
              {tasks?.tasks?.length > 0 && <KanbanBoard tasks={tasks.tasks} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
