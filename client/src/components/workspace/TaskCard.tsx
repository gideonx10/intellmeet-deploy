import type { Task } from "@/types/task";

export default function TaskCard({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (taskId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task._id)}
      className="bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-slate-800">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
            {task.assignee?.name?.[0]?.toUpperCase()}
          </div>
          {task.meeting && (
            <span className="text-xs text-slate-400 truncate">{task.meeting.title}</span>
          )}
        </div>
        {task.dueDate && (
          <span className="text-xs text-slate-400 shrink-0">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
