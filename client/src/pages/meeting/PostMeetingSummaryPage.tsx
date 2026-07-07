import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Loader2, ArrowLeft, Sparkles, Printer, Clock, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { useGetMeeting, useToggleActionItem } from "@/hooks/useMeetings";
import { useCreateTask, useMeetingTasks } from "@/hooks/useTasks";
import { useMyTeams } from "@/hooks/useTeams";
import { useSocket } from "@/socket/useSocket";
import { useAuthStore } from "@/store/authStore";
import SummaryCard from "@/components/meeting/SummaryCard";
import ActionItemsList from "@/components/meeting/ActionItemsList";
import TranscriptSection from "@/components/meeting/TranscriptSection";
import RecordingStatusCard from "@/components/meeting/RecordingStatusCard";
import MeetingTasksList from "@/components/meeting/MeetingTasksList";
import type { ActionItem, Meeting } from "@/types/meeting";

function formatDuration(start?: string, end?: string) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60} sec`;
}

export default function PostMeetingSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: meeting, isLoading: meetingLoading, error: meetingError, refetch } = useGetMeeting(id!);
  const { mutate: toggleActionItem } = useToggleActionItem(id!);
  const { mutate: createTask, isPending: creatingTask, error: createTaskError } = useCreateTask();
  const { data: teams } = useMyTeams();
  const { data: meetingTasks } = useMeetingTasks(id);
  const { user } = useAuthStore();
  const socket = useSocket();
  const qc = useQueryClient();

  // live recordingStatus updates while this page is open, so a host uploading shortly after
  // everyone lands here doesn't need a manual refresh
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("join-meeting-summary", { meetingId: id });

    const handleStatusChange = (payload: { meetingId: string; recordingStatus: Meeting["recordingStatus"]; recordingUrl?: string }) => {
      if (payload.meetingId !== id) return;
      qc.setQueryData<Meeting>(["meeting", id], (prev) =>
        prev ? { ...prev, recordingStatus: payload.recordingStatus, recordingUrl: payload.recordingUrl ?? prev.recordingUrl } : prev
      );
    };
    socket.on("recording-status-changed", handleStatusChange);

    return () => {
      socket.emit("leave-meeting-summary", { meetingId: id });
      socket.off("recording-status-changed", handleStatusChange);
    };
  }, [socket, id, qc]);

  // the video call page caches this same meeting query — within the 5min staleTime we'd
  // otherwise show that stale snapshot instead of fetching the latest state here
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isParticipant =
    !!meeting &&
    !!user &&
    (meeting.host._id === user.id || meeting.participants.some((p) => p.user._id === user.id));

  const [showTranscript, setShowTranscript] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [formTeamId, setFormTeamId] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formDueDate, setFormDueDate] = useState("");

  const noTeams = !!teams && teams.length === 0;
  const formTeam = teams?.find((t) => t._id === formTeamId);

  // local state set from the request's own then/catch, not a useMutation's isPending/etc —
  // those can read stale from a render whose effect got skipped by StrictMode's double-invoke
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<unknown>(null);

  const hasSummarized = useRef(false);

  useEffect(() => {
    if (hasSummarized.current) return;
    // wait for the meeting to load first, or every revisit would re-run summarization and
    // wipe out actionItems/taskId links that already exist
    if (meetingLoading) return;
    if (meetingError) {
      hasSummarized.current = true;
      setError(meetingError);
      setStatus("error");
      return;
    }
    if (!meeting) return;
    hasSummarized.current = true;

    if (meeting.summary || meeting.aiEnabled === false) {
      setStatus("success");
      return;
    }

    api
      .post(`/ai/summarize/${id}`)
      .then(() => {
        setStatus("success");
        refetch();
      })
      .catch((e) => {
        setError(e);
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, meeting, meetingLoading, meetingError]);

  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isError = status === "error";

  const noTranscript = isError && isAxiosError(error) && error.response?.status === 400;
  const noAI = meeting?.aiEnabled === false;
  const duration = formatDuration(meeting?.startedAt, meeting?.endedAt);

  const openConvertForm = (item: ActionItem) => {
    setOpenItemId(item._id ?? null);
    if (item.taskId) {
      // already converted — the task's own team is authoritative here
      setFormTeamId(item.taskId.team);
      setFormAssignee(item.taskId.assignee._id);
      setFormDueDate(item.taskId.dueDate ? item.taskId.dueDate.slice(0, 10) : "");
    } else {
      const defaultTeamId = teams && teams.length > 0 ? teams[0]._id : "";
      setFormTeamId(defaultTeamId);
      const defaultTeam = teams?.find((t) => t._id === defaultTeamId);
      const match = defaultTeam?.members.find(
        (m) => m.user.name.toLowerCase() === item.assignee.toLowerCase()
      );
      setFormAssignee(match?.user._id ?? "");
      setFormDueDate("");
    }
  };

  const handleConvert = (item: ActionItem) => {
    if (!formAssignee || !item._id) return;
    createTask(
      {
        title: item.text,
        assignee: formAssignee,
        team: formTeamId || undefined,
        meeting: id,
        dueDate: formDueDate || undefined,
        actionItemId: item._id,
      },
      {
        onSuccess: () => {
          setOpenItemId(null);
          refetch();
        },
      }
    );
  };

  const handleFormTeamChange = (teamId: string) => {
    setFormTeamId(teamId);
    setFormAssignee("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print bg-white border-b border-slate-200 px-6 py-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Handshake className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-800">IntellMeet</span>
        </button>
      </header>

      <main className="print-summary max-w-2xl mx-auto px-6 py-12 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{meeting?.title || "Meeting Summary"}</h1>
            <p className="text-slate-500 text-sm mt-1">AI-generated meeting recap</p>
            {duration && (
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {duration}
              </p>
            )}
          </div>
          {isSuccess && (
            <Button variant="outline" size="sm" className="no-print shrink-0" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Export
            </Button>
          )}
        </div>

        {isPending && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-500">Generating AI summary...</p>
            </CardContent>
          </Card>
        )}

        {noTranscript && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <Sparkles className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-600 max-w-sm">
                No speech was captured during this meeting, so there's no transcript to summarize.
              </p>
            </CardContent>
          </Card>
        )}

        {isError && !noTranscript && (
          <Card className="border border-red-200 shadow-sm">
            <CardContent className="py-6">
              <p className="text-sm text-red-600">
                {isAxiosError(error) ? error.response?.data?.message || error.message : "Something went wrong generating the summary."}
              </p>
            </CardContent>
          </Card>
        )}

        {isSuccess && noAI && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <Sparkles className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-600 max-w-sm">
                AI features were turned off for this meeting, so no transcript or summary was generated.
              </p>
            </CardContent>
          </Card>
        )}

        {isSuccess && !noAI && meeting && (
          <>
            <SummaryCard summary={meeting.summary || ""} />

            <ActionItemsList
              actionItems={meeting.actionItems}
              createTaskError={createTaskError}
              noTeams={noTeams}
              teams={teams}
              openItemId={openItemId}
              formTeamId={formTeamId}
              formAssignee={formAssignee}
              formDueDate={formDueDate}
              formTeam={formTeam}
              creatingTask={creatingTask}
              onToggleDone={toggleActionItem}
              onOpenConvertForm={openConvertForm}
              onCloseForm={() => setOpenItemId(null)}
              onFormTeamChange={handleFormTeamChange}
              onFormAssigneeChange={setFormAssignee}
              onFormDueDateChange={setFormDueDate}
              onConvert={handleConvert}
            />

            <TranscriptSection
              transcript={meeting.transcript}
              showTranscript={showTranscript}
              onToggle={() => setShowTranscript((p) => !p)}
            />
          </>
        )}

        {isParticipant && meeting && meeting.recordingStatus && meeting.recordingStatus !== "none" && (
          <RecordingStatusCard recordingStatus={meeting.recordingStatus} recordingUrl={meeting.recordingUrl} />
        )}

        {/* independent of the AI summary pipeline, so shows regardless of summarization status */}
        {meetingTasks && meetingTasks.length > 0 && <MeetingTasksList tasks={meetingTasks} />}

        <Button variant="outline" className="no-print w-full" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </main>
    </div>
  );
}
