import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/socket/useSocket";
import api from "@/lib/api";
import type { Task } from "@/types/task";

// stays in sync purely through the team's socket room — the server broadcasts
// task-created/updated/deleted to everyone in team:<teamId>, including the actor, so
// there's no need for each mutation to also invalidate/refetch
export const useTeamTasks = (teamId?: string) => {
  const socket = useSocket();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", teamId],
    queryFn: () => api.get(`/tasks?team=${teamId}`).then((r) => r.data.tasks as Task[]),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (!socket || !teamId) return;

    socket.emit("join-team", { teamId });

    const handleCreated = (task: Task) => {
      qc.setQueryData<Task[]>(["tasks", teamId], (prev) => {
        if (!prev) return [task];
        if (prev.some((t) => t._id === task._id)) return prev;
        return [task, ...prev];
      });
    };
    const handleUpdated = (task: Task) => {
      qc.setQueryData<Task[]>(["tasks", teamId], (prev) => prev?.map((t) => (t._id === task._id ? task : t)));
    };
    const handleDeleted = ({ _id }: { _id: string }) => {
      qc.setQueryData<Task[]>(["tasks", teamId], (prev) => prev?.filter((t) => t._id !== _id));
    };

    socket.on("task-created", handleCreated);
    socket.on("task-updated", handleUpdated);
    socket.on("task-deleted", handleDeleted);

    return () => {
      socket.emit("leave-team", { teamId });
      socket.off("task-created", handleCreated);
      socket.off("task-updated", handleUpdated);
      socket.off("task-deleted", handleDeleted);
    };
  }, [socket, teamId, qc]);

  return query;
};

// tasks created live during a meeting, shown alongside the AI action items on the summary
// page — no socket sync needed, it's a one-time view not a live board
export const useMeetingTasks = (meetingId?: string) =>
  useQuery({
    queryKey: ["tasks", "meeting", meetingId],
    queryFn: () => api.get(`/tasks?meeting=${meetingId}`).then((r) => r.data.tasks as Task[]),
    enabled: !!meetingId,
  });

interface CreateTaskInput {
  title: string;
  assignee: string;
  team?: string;
  meeting?: string;
  dueDate?: string;
  // if set and already converted, updates that task instead of creating a duplicate
  actionItemId?: string;
}

export const useCreateTask = () =>
  useMutation({
    mutationFn: (data: CreateTaskInput) => api.post("/tasks", data),
  });

export const useUpdateTaskStatus = () =>
  useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task["status"] }) =>
      api.patch(`/tasks/${id}/status`, { status }),
  });
