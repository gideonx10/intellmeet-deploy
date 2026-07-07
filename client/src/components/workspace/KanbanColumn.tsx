import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import NewTaskForm from "./NewTaskForm";
import TaskCard from "./TaskCard";
import type { Task } from "@/types/task";
import type { TeamMember } from "@/types/team";

export default function KanbanColumn({
  columnKey,
  label,
  tasks,
  loadingTasks,
  isNewTaskColumn,
  showForm,
  onToggleForm,
  members,
  title,
  onTitleChange,
  assignee,
  onAssigneeChange,
  dueDate,
  onDueDateChange,
  creating,
  createError,
  onSubmitNewTask,
  onDragStartTask,
  onDrop,
}: {
  columnKey: Task["status"];
  label: string;
  tasks: Task[] | undefined;
  loadingTasks: boolean;
  isNewTaskColumn: boolean;
  showForm: boolean;
  onToggleForm: () => void;
  members: TeamMember[] | undefined;
  title: string;
  onTitleChange: (value: string) => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  creating: boolean;
  createError: unknown;
  onSubmitNewTask: () => void;
  onDragStartTask: (taskId: string) => void;
  onDrop: (status: Task["status"]) => void;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(columnKey)}
      className="bg-slate-100 rounded-xl p-3 min-h-[420px]"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        {isNewTaskColumn && (
          <Button size="icon-sm" variant="ghost" onClick={onToggleForm}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isNewTaskColumn && showForm && (
        <NewTaskForm
          members={members}
          title={title}
          onTitleChange={onTitleChange}
          assignee={assignee}
          onAssigneeChange={onAssigneeChange}
          dueDate={dueDate}
          onDueDateChange={onDueDateChange}
          creating={creating}
          createError={createError}
          onSubmit={onSubmitNewTask}
        />
      )}

      {loadingTasks ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks
            ?.filter((t) => t.status === columnKey)
            .map((task) => (
              <TaskCard key={task._id} task={task} onDragStart={onDragStartTask} />
            ))}
        </div>
      )}
    </div>
  );
}
