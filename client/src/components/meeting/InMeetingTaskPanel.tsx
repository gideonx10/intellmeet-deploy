import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyTeams } from "@/hooks/useTeams";
import { useCreateTask } from "@/hooks/useTasks";

interface Props {
  meetingId: string;
}

export default function InMeetingTaskPanel({ meetingId }: Props) {
  const { data: teams } = useMyTeams();
  const { mutate: createTask, isPending, error, isSuccess, reset } = useCreateTask();

  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!teamId && teams && teams.length > 0) setTeamId(teams[0]._id);
  }, [teams, teamId]);

  const team = teams?.find((t) => t._id === teamId);

  const handleCreate = () => {
    if (!title.trim() || !assignee || !teamId) return;
    createTask(
      { title: title.trim(), assignee, team: teamId, meeting: meetingId, dueDate: dueDate || undefined },
      {
        onSuccess: () => {
          setTitle("");
          setAssignee("");
          setDueDate("");
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-l-2xl shadow-xl border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">New Task</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!teams || teams.length === 0 ? (
          <p className="text-sm text-slate-400">
            You're not on a team yet. Join or create one from the Workspace to create tasks here.
          </p>
        ) : (
          <>
            {teams.length > 1 && (
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setAssignee("");
                }}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (isSuccess) reset();
              }}
              className="text-sm"
            />

            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Assign to...</option>
              {team?.members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            />

            {error && (
              <p className="text-xs text-red-500">
                {isAxiosError(error) ? error.response?.data?.message || "Failed to create task" : "Failed to create task"}
              </p>
            )}
            {isSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Task created — it's on the board now
              </p>
            )}

            <Button size="sm" className="w-full" disabled={!title.trim() || !assignee || isPending} onClick={handleCreate}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
