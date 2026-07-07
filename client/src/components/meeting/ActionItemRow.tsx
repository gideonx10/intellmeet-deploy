import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/types/meeting";
import type { Team } from "@/types/team";

export default function ActionItemRow({
  item,
  isOpen,
  noTeams,
  teams,
  formTeamId,
  formAssignee,
  formDueDate,
  formTeam,
  creatingTask,
  onToggleDone,
  onOpenConvertForm,
  onCloseForm,
  onFormTeamChange,
  onFormAssigneeChange,
  onFormDueDateChange,
  onConvert,
}: {
  item: ActionItem;
  isOpen: boolean;
  noTeams: boolean;
  teams: Team[] | undefined;
  formTeamId: string;
  formAssignee: string;
  formDueDate: string;
  formTeam: Team | undefined;
  creatingTask: boolean;
  onToggleDone: (itemId: string) => void;
  onOpenConvertForm: (item: ActionItem) => void;
  onCloseForm: () => void;
  onFormTeamChange: (teamId: string) => void;
  onFormAssigneeChange: (userId: string) => void;
  onFormDueDateChange: (date: string) => void;
  onConvert: (item: ActionItem) => void;
}) {
  return (
    <div className="rounded-lg hover:bg-slate-50">
      <div className="w-full flex items-start gap-3 px-3 py-2">
        <button onClick={() => item._id && onToggleDone(item._id)} className="mt-0.5 shrink-0">
          {item.done ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-slate-300" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm text-slate-800", item.done && "line-through text-slate-400")}>
            {item.text}
          </p>
          <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
            {item.taskId?.assignee.name ?? item.assignee}
          </span>
          {item.taskId && (
            <span className="inline-block mt-1 ml-1 text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 capitalize">
              {item.taskId.status.replace("-", " ")}
            </span>
          )}
        </div>

        {noTeams ? (
          <span className="no-print text-xs text-slate-400 shrink-0 mt-1">Join a team to assign tasks</span>
        ) : item.taskId ? (
          <Button
            variant="ghost"
            size="sm"
            className="no-print shrink-0 text-blue-600 hover:text-blue-700"
            onClick={() => onOpenConvertForm(item)}
          >
            Reassign
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="no-print shrink-0"
            onClick={() => onOpenConvertForm(item)}
          >
            Convert to Task
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="no-print px-3 pb-3 pl-11 space-y-2">
          {teams && teams.length > 1 && !item.taskId && (
            <select
              value={formTeamId}
              onChange={(e) => onFormTeamChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={formAssignee}
            onChange={(e) => onFormAssigneeChange(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Assign to...</option>
            {formTeam?.members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={formDueDate}
            onChange={(e) => onFormDueDateChange(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!formAssignee || creatingTask} onClick={() => onConvert(item)}>
              {creatingTask ? "Saving..." : item.taskId ? "Save" : "Create Task"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCloseForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
