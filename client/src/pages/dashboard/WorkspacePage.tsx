import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { ArrowLeft, Plus, Users2, UsersRound, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TeamManagerDialog from "@/components/workspace/TeamManagerDialog";
import { useCreateTask, useTeamTasks, useUpdateTaskStatus } from "@/hooks/useTasks";
import { useAcceptInvite, useMyPendingInvites, useMyTeams, useRejectInvite } from "@/hooks/useTeams";
import type { Task } from "@/types/task";

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: teams, isLoading: loadingTeams } = useMyTeams();
  const { data: pendingInvites } = useMyPendingInvites();
  const { mutate: acceptInvite, isPending: acceptingInvite } = useAcceptInvite();
  const { mutate: rejectInvite, isPending: rejectingInvite } = useRejectInvite();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerMode, setManagerMode] = useState<"create" | "join">("create");
  // "manage" shows the selected team's roster/settings; "entry" shows the create/join tabs —
  // kept distinct from `selectedTeam` so clicking "Join a team" while already on a team doesn't
  // land on that team's Manage view instead.
  const [managerView, setManagerView] = useState<"manage" | "entry">("entry");

  useEffect(() => {
    if (!selectedTeamId && teams && teams.length > 0) {
      setSelectedTeamId(teams[0]._id);
    }
  }, [teams, selectedTeamId]);

  // Notification deep-links (e.g. a join-request notification) land here as
  // /workspace?team=<id>&manage=1 — select that team and open Manage Team automatically.
  useEffect(() => {
    const deepLinkTeam = searchParams.get("team");
    if (!deepLinkTeam || !teams) return;
    if (teams.some((t) => t._id === deepLinkTeam)) {
      setSelectedTeamId(deepLinkTeam);
      if (searchParams.get("manage") === "1") {
        setManagerView("manage");
        setManagerOpen(true);
      }
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const selectedTeam = teams?.find((t) => t._id === selectedTeamId) ?? null;

  const { data: tasks, isLoading: loadingTasks, error: tasksError } = useTeamTasks(selectedTeamId ?? undefined);
  const { mutate: createTask, isPending: creating, error: createError } = useCreateTask();
  const { mutate: updateStatus } = useUpdateTaskStatus();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim() || !assignee || !selectedTeamId) return;
    createTask(
      { title, assignee, team: selectedTeamId, dueDate: dueDate || undefined },
      {
        onSuccess: () => {
          setTitle("");
          setAssignee("");
          setDueDate("");
          setShowForm(false);
        },
      }
    );
  };

  const handleDrop = (status: Task["status"]) => {
    if (draggedId) updateStatus({ id: draggedId, status });
    setDraggedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-slate-800">Workspace</span>

        <div className="flex items-center gap-2 ml-auto">
          {teams && teams.length > 0 && (
            <>
              {teams.length > 1 ? (
                <select
                  value={selectedTeamId ?? ""}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-slate-600 font-medium">{selectedTeam?.name}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setManagerView("manage");
                  setManagerOpen(true);
                }}
              >
                <Users2 className="w-4 h-4 mr-1" /> Manage team
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setManagerView("entry");
              setManagerMode("join");
              setManagerOpen(true);
            }}
          >
            <KeyRound className="w-4 h-4 mr-1" /> Join a team
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setManagerView("entry");
              setManagerMode("create");
              setManagerOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Create a team
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {pendingInvites && pendingInvites.length > 0 && (
          <Card className="border border-blue-200 bg-blue-50/50 shadow-sm mb-6">
            <CardContent className="py-4 space-y-2">
              <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Pending team invites
              </p>
              {pendingInvites.map((inv) => (
                <div key={inv.teamId} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2">
                  <p className="text-sm text-slate-800">
                    You've been invited to join <span className="font-medium">{inv.teamName}</span>
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" disabled={acceptingInvite || rejectingInvite} onClick={() => acceptInvite(inv.teamId)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" disabled={acceptingInvite || rejectingInvite} onClick={() => rejectInvite(inv.teamId)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loadingTeams ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !teams || teams.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <UsersRound className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">You're not on a team yet</p>
              <p className="text-xs text-slate-400 mt-1">
                The Kanban board is shared per team. Create a team to start tracking tasks together.
              </p>
            </div>
            <Button
              onClick={() => {
                setManagerView("entry");
                setManagerMode("create");
                setManagerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Create a team
            </Button>
          </div>
        ) : (
          <>
            {tasksError && (
              <p className="text-sm text-red-500 mb-4">
                {isAxiosError(tasksError) ? tasksError.response?.data?.message || "Failed to load tasks" : "Failed to load tasks"}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.key)}
                  className="bg-slate-100 rounded-xl p-3 min-h-[420px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                    {col.key === "todo" && (
                      <Button size="icon-sm" variant="ghost" onClick={() => setShowForm((p) => !p)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {col.key === "todo" && showForm && (
                    <div className="bg-white rounded-lg p-3 mb-3 space-y-2 shadow-sm">
                      {createError && (
                        <p className="text-xs text-red-500">
                          {isAxiosError(createError) ? createError.response?.data?.message || "Failed to create task" : "Failed to create task"}
                        </p>
                      )}
                      <Input
                        placeholder="Task title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-sm"
                      />
                      <select
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Assign to...</option>
                        {selectedTeam?.members.map((m) => (
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
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!title.trim() || !assignee || creating}
                        onClick={handleCreate}
                      >
                        {creating ? "Adding..." : "Add task"}
                      </Button>
                    </div>
                  )}

                  {loadingTasks ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks
                        ?.filter((t) => t.status === col.key)
                        .map((task) => (
                          <div
                            key={task._id}
                            draggable
                            onDragStart={() => setDraggedId(task._id)}
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
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <TeamManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        team={managerView === "manage" ? selectedTeam : null}
        initialMode={managerMode}
        onTeamCreated={(teamId) => {
          setSelectedTeamId(teamId);
          setManagerView("manage");
          setManagerOpen(false);
        }}
      />
    </div>
  );
}
