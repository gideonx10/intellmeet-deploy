import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { ArrowLeft, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TeamManagerDialog from "@/components/workspace/TeamManagerDialog";
import TeamSwitcher from "@/components/workspace/TeamSwitcher";
import PendingInvitesBanner from "@/components/workspace/PendingInvitesBanner";
import KanbanColumn from "@/components/workspace/KanbanColumn";
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

        <TeamSwitcher
          teams={teams}
          selectedTeam={selectedTeam}
          selectedTeamId={selectedTeamId}
          onSelectTeam={setSelectedTeamId}
          onManageTeam={() => {
            setManagerView("manage");
            setManagerOpen(true);
          }}
          onJoinTeam={() => {
            setManagerView("entry");
            setManagerMode("join");
            setManagerOpen(true);
          }}
          onCreateTeam={() => {
            setManagerView("entry");
            setManagerMode("create");
            setManagerOpen(true);
          }}
        />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {pendingInvites && pendingInvites.length > 0 && (
          <PendingInvitesBanner
            invites={pendingInvites}
            accepting={acceptingInvite}
            rejecting={rejectingInvite}
            onAccept={acceptInvite}
            onReject={rejectInvite}
          />
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
                <KanbanColumn
                  key={col.key}
                  columnKey={col.key}
                  label={col.label}
                  tasks={tasks}
                  loadingTasks={loadingTasks}
                  isNewTaskColumn={col.key === "todo"}
                  showForm={showForm}
                  onToggleForm={() => setShowForm((p) => !p)}
                  members={selectedTeam?.members}
                  title={title}
                  onTitleChange={setTitle}
                  assignee={assignee}
                  onAssigneeChange={setAssignee}
                  dueDate={dueDate}
                  onDueDateChange={setDueDate}
                  creating={creating}
                  createError={createError}
                  onSubmitNewTask={handleCreate}
                  onDragStartTask={setDraggedId}
                  onDrop={handleDrop}
                />
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
