import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@/types/team";

export default function NewTaskForm({
  members,
  title,
  onTitleChange,
  assignee,
  onAssigneeChange,
  dueDate,
  onDueDateChange,
  creating,
  createError,
  onSubmit,
}: {
  members: TeamMember[] | undefined;
  title: string;
  onTitleChange: (value: string) => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  creating: boolean;
  createError: unknown;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-white rounded-lg p-3 mb-3 space-y-2 shadow-sm">
      {Boolean(createError) && (
        <p className="text-xs text-red-500">
          {isAxiosError(createError) ? createError.response?.data?.message || "Failed to create task" : "Failed to create task"}
        </p>
      )}
      <Input
        placeholder="Task title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="text-sm"
      />
      <select
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Assign to...</option>
        {members?.map((m) => (
          <option key={m.user._id} value={m.user._id}>
            {m.user.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button
        size="sm"
        className="w-full"
        disabled={!title.trim() || !assignee || creating}
        onClick={onSubmit}
      >
        {creating ? "Adding..." : "Add task"}
      </Button>
    </div>
  );
}
