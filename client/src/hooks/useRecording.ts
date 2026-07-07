import { useEffect, useRef, useState } from "react";

export const recordingChannelName = (meetingId: string) => `intellmeet-recording-${meetingId}`;

export const useRecording = (
  meetingId: string,
  showToast?: (message: string, durationMs?: number) => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const helperWindowRef = useRef<Window | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const clearWatchdog = () => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = null;
  };

  useEffect(() => {
    const channel = new BroadcastChannel(recordingChannelName(meetingId));
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, message } = (event.data || {}) as { type?: string; message?: string };

      if (type === "started") {
        setIsRecording(true);
        setRecordingTime(0);
        clearTimer();
        timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        return;
      }

      if (type === "surface-rejected") {
        showToast?.(message || 'Please pick "Chrome Tab" and select the meeting tab, then try again', 4500);
        return;
      }

      if (type === "mic-fallback") {
        showToast?.("Couldn't access your microphone — recording tab audio only", 4000);
        return;
      }

      if (type === "cancelled") {
        showToast?.("Recording cancelled");
        setIsRecording(false);
        clearTimer();
        clearWatchdog();
        helperWindowRef.current = null;
        return;
      }

      if (type === "uploading" || type === "error" || type === "closed") {
        setIsRecording(false);
        clearTimer();
        clearWatchdog();
        helperWindowRef.current = null;
        if (type === "error") showToast?.("Recording failed");
        if (type === "closed") showToast?.("Recording window was closed — recording stopped");
      }
    };

    return () => {
      channel.close();
      clearTimer();
      clearWatchdog();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const startRecording = () => {
    const helper = window.open(
      `/recording-worker/${meetingId}`,
      "intellmeet-recording",
      "width=420,height=420,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes"
    );

    if (!helper) {
      showToast?.("Couldn't open the recording window — please allow pop-ups for this site and try again", 5000);
      return;
    }

    helperWindowRef.current = helper;

    clearWatchdog();
    watchdogRef.current = setInterval(() => {
      if (helperWindowRef.current?.closed) {
        clearWatchdog();
        helperWindowRef.current = null;
        setIsRecording((wasRecording) => {
          if (wasRecording) showToast?.("Recording window was closed — recording stopped");
          return false;
        });
        clearTimer();
      }
    }, 1000);
  };

  const stopRecording = () => {
    channelRef.current?.postMessage({ type: "stop" });
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return {
    isRecording,
    recordingTime: formatTime(recordingTime),
    toggleRecording,
  };
};
