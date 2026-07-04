import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { UserMinus, UserPlus, ShieldPlus, Pencil, Check, X, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import {
  useCreateTeam,
  useJoinTeamByCode,
  useRenameTeam,
  usePromoteTeamMember,
  useRemoveTeamMember,
  useAcceptJoinRequest,
  useRejectJoinRequest,
  useInviteByEmail,
} from "@/hooks/useTeams";
import type { Team } from "@/types/team";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onTeamCreated?: (teamId: string) => void;
  initialMode?: "create" | "join";
}

function errorMessage(err: unknown, fallback: string) {
  return isAxiosError(err) ? err.response?.data?.message || fallback : fallback;
}

export default function TeamManagerDialog({ open, onOpenChange, team, onTeamCreated, initialMode = "create" }: Props) {
  const { user } = useAuthStore();
  const teamId = team?._id ?? "";

  const { mutate: createTeam, isPending: creating, error: createError } = useCreateTeam();
  const { mutate: joinByCode, isPending: joining, error: joinError, isSuccess: joinSent, data: joinData, reset: resetJoin } = useJoinTeamByCode();
  const { mutate: renameTeam, isPending: renaming, error: renameError } = useRenameTeam(teamId);
  const { mutate: promoteMember, isPending: promoting } = usePromoteTeamMember(teamId);
  const { mutate: removeMember } = useRemoveTeamMember(teamId);
  const { mutate: acceptRequest, isPending: acceptingRequest } = useAcceptJoinRequest(teamId);
  const { mutate: rejectRequest, isPending: rejectingRequest } = useRejectJoinRequest(teamId);
  const { mutate: inviteByEmail, isPending: inviting, error: inviteError, isSuccess: inviteSent, reset: resetInvite } = useInviteByEmail(teamId);

  const [mode, setMode] = useState<"create" | "join">(initialMode);
  const [newTeamName, setNewTeamName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (open && !team) {
      setMode(initialMode);
      resetJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, team, initialMode]);

  useEffect(() => {
    setEditingName(false);
    setInviteEmail("");
    resetInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const isAdmin = !!team && team.members.some((m) => m.user._id === user?.id && m.role === "admin");

  const handleCreate = () => {
    if (!newTeamName.trim()) return;
    createTeam(newTeamName.trim(), {
      onSuccess: ({ data }) => {
        setNewTeamName("");
        onTeamCreated?.(data.team._id);
      },
    });
  };

  const handleJoin = () => {
    if (!joinCodeInput.trim()) return;
    joinByCode(joinCodeInput.trim());
  };

  const startRename = () => {
    if (!team) return;
    setNameDraft(team.name);
    setEditingName(true);
  };

  const handleRename = () => {
    if (!nameDraft.trim()) return;
    renameTeam(nameDraft.trim(), { onSuccess: () => setEditingName(false) });
  };

  const handleCopyCode = () => {
    if (!team?.joinCode) return;
    navigator.clipboard.writeText(team.joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteByEmail(inviteEmail.trim(), { onSuccess: () => setInviteEmail("") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {team ? (
              editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <button onClick={handleRename} disabled={renaming || !nameDraft.trim()} title="Save" className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingName(false)} title="Cancel" className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Manage "{team.name}"</span>
                  {isAdmin && (
                    <button onClick={startRename} title="Rename team" className="text-slate-400 hover:text-slate-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            ) : (
              "Teams"
            )}
          </DialogTitle>
        </DialogHeader>

        {renameError && (
          <p className="text-xs text-red-500">{errorMessage(renameError, "Failed to rename team")}</p>
        )}

        {team ? (
          <div className="space-y-4">
            {isAdmin && team.joinCode && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Team code (admin only)</p>
                <button
                  onClick={handleCopyCode}
                  title="Copy join code"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-3 py-1.5 rounded-lg font-mono tracking-widest"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {team.joinCode}
                </button>
                {codeCopied && <p className="text-xs text-green-600 mt-1">Copied!</p>}
                <p className="text-xs text-slate-400 mt-1">
                  Share this code so others can request to join. It never changes.
                </p>
              </div>
            )}

            {isAdmin && team.joinRequests && team.joinRequests.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Pending join requests ({team.joinRequests.length})
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {team.joinRequests.map((r) => (
                    <div key={r.user._id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{r.user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{r.user.email}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          disabled={acceptingRequest || rejectingRequest}
                          onClick={() => acceptRequest(r.user._id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={acceptingRequest || rejectingRequest}
                          onClick={() => rejectRequest(r.user._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Members ({team.members.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {team.members.map((m) => (
                  <div key={m.user._id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {m.user.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{m.user.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && m.role !== "admin" && (
                        <button
                          title="Promote to admin"
                          disabled={promoting}
                          onClick={() => promoteMember(m.user._id)}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <ShieldPlus className="w-4 h-4" />
                        </button>
                      )}
                      {(isAdmin || m.user._id === user?.id) && m.role !== "admin" && (
                        <button
                          title="Remove from team"
                          onClick={() => removeMember(m.user._id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Invite by email</p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="person@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button size="icon-sm" disabled={inviting || !inviteEmail.trim()} onClick={handleInvite} title="Send invite">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-xs text-red-500 mt-1">{errorMessage(inviteError, "Failed to send invite")}</p>
                )}
                {inviteSent && <p className="text-xs text-green-600 mt-1">Invite sent</p>}

                {team.invites && team.invites.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-400">Pending invites:</p>
                    {team.invites.map((inv) => (
                      <p key={inv.email} className="text-xs text-slate-500 truncate">{inv.email}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setMode("create")}
                className={`text-sm px-3 py-1.5 rounded-lg ${mode === "create" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Create a team
              </button>
              <button
                onClick={() => setMode("join")}
                className={`text-sm px-3 py-1.5 rounded-lg ${mode === "join" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Join a team
              </button>
            </div>

            {mode === "create" ? (
              <div className="space-y-3">
                <Input placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                {createError && (
                  <p className="text-xs text-red-500">{errorMessage(createError, "Failed to create team")}</p>
                )}
                <Button className="w-full" disabled={!newTeamName.trim() || creating} onClick={handleCreate}>
                  {creating ? "Creating..." : "Create team"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Enter team join code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  className="font-mono tracking-widest"
                />
                {joinError && (
                  <p className="text-xs text-red-500">{errorMessage(joinError, "Invalid code")}</p>
                )}
                {joinSent && (
                  <p className="text-xs text-green-600">
                    Request sent to {joinData?.data?.teamName ?? "the team"} — waiting for an admin to accept.
                  </p>
                )}
                <Button className="w-full" disabled={!joinCodeInput.trim() || joining} onClick={handleJoin}>
                  {joining ? "Sending request..." : "Request to join"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
