import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Team, MyTeamInvite } from "@/types/team";

const invalidateTeam = (qc: ReturnType<typeof useQueryClient>, teamId: string) => {
  qc.invalidateQueries({ queryKey: ["teams"] });
  qc.invalidateQueries({ queryKey: ["team", teamId] });
};

export const useMyTeams = () =>
  useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get("/teams").then((r) => r.data.teams as Team[]),
  });

export const useTeam = (teamId?: string) =>
  useQuery({
    queryKey: ["team", teamId],
    queryFn: () => api.get(`/teams/${teamId}`).then((r) => r.data.team as Team),
    enabled: !!teamId,
  });

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post("/teams", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
};

export const useRenameTeam = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.patch(`/teams/${teamId}`, { name }),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

export const usePromoteTeamMember = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.patch(`/teams/${teamId}/members/${userId}/promote`),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

export const useRemoveTeamMember = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

// creates a pending request for an admin to act on — never adds the user directly
export const useJoinTeamByCode = () =>
  useMutation({
    mutationFn: (code: string) => api.post("/teams/join", { code }),
  });

export const useAcceptJoinRequest = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/teams/${teamId}/join-requests/${userId}/accept`),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

export const useRejectJoinRequest = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/teams/${teamId}/join-requests/${userId}/reject`),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

export const useInviteByEmail = (teamId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.post(`/teams/${teamId}/invites`, { email }),
    onSuccess: () => invalidateTeam(qc, teamId),
  });
};

export const useMyPendingInvites = () =>
  useQuery({
    queryKey: ["myTeamInvites"],
    queryFn: () => api.get("/teams/invites/me").then((r) => r.data.invites as MyTeamInvite[]),
  });

export const useAcceptInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.post(`/teams/${teamId}/invites/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["myTeamInvites"] });
    },
  });
};

export const useRejectInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.post(`/teams/${teamId}/invites/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myTeamInvites"] }),
  });
};
