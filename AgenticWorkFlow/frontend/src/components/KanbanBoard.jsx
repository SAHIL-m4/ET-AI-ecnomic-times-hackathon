const COLUMNS = [
  { key: "todo",        label: "To do",      dot: "bg-gray-300" },
  { key: "inprogress",  label: "In progress", dot: "bg-blue-400" },
  { key: "done",        label: "Done",        dot: "bg-green-500" },
];

const PRIORITY_COLORS = {
  high:   "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low:    "text-gray-500 bg-gray-50 border-gray-200",
};

export default function KanbanBoard({ tasks }) {
  const grouped = { todo: [], inprogress: [], done: [] };
  tasks.forEach(t => { grouped[t.status] = [...(grouped[t.status] || []), t]; });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">Task board</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-3">
        {COLUMNS.map(col => (
          <div key={col.key}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
              <span className="text-xs font-medium text-gray-500">{col.label}</span>
              <span className="text-xs text-gray-300 ml-auto">{grouped[col.key]?.length || 0}</span>
            </div>
            {(grouped[col.key] || []).map(task => (
              <div key={task.id} className={`mb-2 p-2.5 rounded-lg border text-xs ${task.at_risk ? "border-l-2 border-l-amber-400 border-t-gray-200 border-r-gray-200 border-b-gray-200" : "border-gray-200"} bg-gray-50`}>
                <p className="font-medium text-gray-800 leading-snug mb-1">{task.title}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {task.owner
                    ? <span className="text-gray-400">{task.owner}</span>
                    : <span className="text-orange-500">No owner</span>
                  }
                  {task.due_date && <span className="text-gray-300">· {task.due_date}</span>}
                  {task.priority && (
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  )}
                </div>
                {task.at_risk && (
                  <p className="mt-1 text-amber-600 font-medium">At risk</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
