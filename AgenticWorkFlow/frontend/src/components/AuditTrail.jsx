import { useState } from "react";

const AGENT_COLORS = {
  context_parser:     { bg: "bg-purple-50",  text: "text-purple-800",  border: "border-purple-200", label: "Agent 1" },
  decision_extractor: { bg: "bg-teal-50",    text: "text-teal-800",    border: "border-teal-200",   label: "Agent 2" },
  task_architect:     { bg: "bg-blue-50",    text: "text-blue-800",    border: "border-blue-200",   label: "Agent 3" },
  watchdog:           { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",  label: "Agent 4" },
  system:             { bg: "bg-gray-50",    text: "text-gray-700",    border: "border-gray-200",   label: "System" },
};

const ACTION_COLORS = {
  self_correct: "text-orange-600",
  await_gate:   "text-blue-600",
  proceed:      "text-green-600",
  escalate:     "text-red-600",
};

export default function AuditTrail({ entries }) {
  const [expanded, setExpanded] = useState(new Set([0]));

  function toggle(i) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Audit trail</span>
        <span className="text-xs text-gray-400">click any step to see reasoning</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
        {entries.map((entry, i) => {
          const colors = AGENT_COLORS[entry.agent] || AGENT_COLORS.system;
          const isExpanded = expanded.has(i);
          const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
          return (
            <div key={i} className={`cursor-pointer transition-colors ${isExpanded ? "bg-gray-50" : "hover:bg-gray-50"}`} onClick={() => toggle(i)}>
              <div className="flex items-start gap-2 px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-0.5 flex-shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}>
                  {colors.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{entry.reasoning?.split(".")[0]}.</p>
                  {entry.flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.flags.map((f, fi) => (
                        <span key={fi} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">{ts}</span>
                  {entry.next_action && (
                    <span className={`text-xs font-medium ${ACTION_COLORS[entry.next_action] || "text-gray-500"}`}>
                      {entry.next_action.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="mx-4 mb-3 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 leading-relaxed">
                  <p className="font-medium text-gray-700 mb-1">Full reasoning</p>
                  <p>{entry.reasoning}</p>
                  {entry.confidence !== undefined && (
                    <p className="mt-1 text-gray-400">Confidence: {(entry.confidence * 100).toFixed(0)}%</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
