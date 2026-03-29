const GATE_INFO = {
  1: {
    title: "Gate 1 — Review parsed context",
    desc: "Agent 1 has identified speakers and segmented topics. Approve to begin decision extraction.",
    color: "bg-blue-50 border-blue-200",
    textColor: "text-blue-800",
  },
  2: {
    title: "Gate 2 — Review tasks before publishing",
    desc: "Agent 3 has created tasks from all decisions. Approve to push to the task board.",
    color: "bg-green-50 border-green-200",
    textColor: "text-green-800",
  },
};

export default function GateBanner({ gate, onApprove }) {
  const info = GATE_INFO[gate];
  if (!info) return null;
  return (
    <div className={`flex items-center justify-between rounded-xl border px-5 py-3 mb-4 ${info.color}`}>
      <div>
        <p className={`text-sm font-medium ${info.textColor}`}>{info.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{info.desc}</p>
      </div>
      <button
        onClick={onApprove}
        className="ml-6 bg-white border border-gray-200 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700 flex-shrink-0"
      >
        Approve
      </button>
    </div>
  );
}
