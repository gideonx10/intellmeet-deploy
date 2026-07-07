import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useUploadRecording } from "@/hooks/useMeetings";
import { recordingChannelName } from "@/hooks/useRecording";

export default function RecordingWorkerPage() {
  const { id } = useParams<{ id: string }>();
  const meetingId = id!;
  const { mutate: uploadRecording } = useUploadRecording(meetingId);

  const [status, setStatus] = useState("Requesting screen share…");
  const [micFallback, setMicFallback] = useState(false);
  const [canStop, setCanStop] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const stopRequestedRef = useRef(false);
  const finishedRef = useRef(false);
  const startedOnceRef = useRef(false);

  useEffect(() => {
    document.title = "Recording — IntellMeet";

    const channel = new BroadcastChannel(recordingChannelName(meetingId));
    channelRef.current = channel;

    const broadcast = (type: string, message?: string) => {
      channelRef.current?.postMessage({ type, message });
    };

    const cleanupTracks = () => {
      displayStreamRef.current?.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      compositeStreamRef.current?.getTracks().forEach((t) => t.stop());
      compositeStreamRef.current = null;
    };

    const finishAndClose = (delayMs: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setTimeout(() => window.close(), delayMs);
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        return;
      }
      cleanupTracks();
      broadcast("cancelled");
      finishAndClose(500);
    };

    channel.onmessage = (event) => {
      if (event.data?.type === "stop") {
        stopRequestedRef.current = true;
        stopRecording();
      }
    };

    const start = async () => {
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser" } as MediaTrackConstraints,
          audio: true,
        });
      } catch {
        setStatus("Recording cancelled.");
        broadcast("cancelled");
        finishAndClose(1200);
        return;
      }

      if (stopRequestedRef.current) {
        displayStream.getTracks().forEach((t) => t.stop());
        broadcast("cancelled");
        finishAndClose(500);
        return;
      }

      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        setStatus("No video was shared. Please try again.");
        broadcast("error", "No video track");
        finishAndClose(2000);
        return;
      }

      const settings = videoTrack.getSettings() as MediaTrackSettings & { displaySurface?: string };
      if (settings.displaySurface !== "browser") {
        displayStream.getTracks().forEach((t) => t.stop());
        setStatus('Please pick "Chrome Tab" and select the meeting tab, then try again.');
        broadcast("surface-rejected");
        finishAndClose(3500);
        return;
      }

      displayStreamRef.current = displayStream;
      videoTrack.onended = () => stopRecording();

      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
      } catch {
        setMicFallback(true);
        broadcast("mic-fallback");
      }

      if (stopRequestedRef.current) {
        cleanupTracks();
        broadcast("cancelled");
        finishAndClose(500);
        return;
      }

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      const connectAudio = (stream: MediaStream) => {
        if (stream.getAudioTracks().length === 0) return;
        try {
          audioCtx.createMediaStreamSource(stream).connect(dest);
        } catch {
          return;
        }
      };
      connectAudio(displayStream);
      if (micStream) connectAudio(micStream);

      const composite = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()]);
      compositeStreamRef.current = composite;

      const recorder = new MediaRecorder(composite, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        cleanupTracks();
        setCanStop(false);
        setStatus("Uploading recording…");
        broadcast("uploading");
        uploadRecording(blob, {
          onSuccess: () => {
            setStatus("Recording saved. This window will close automatically.");
            finishAndClose(1500);
          },
          onError: () => {
            setStatus("Upload failed. This window will close automatically.");
            broadcast("error", "Upload failed");
            finishAndClose(3000);
          },
        });
      };

      recorder.start(1000);
      setStatus("Recording in progress. Do not close this window.");
      setCanStop(true);
      broadcast("started");
    };

    if (!startedOnceRef.current) {
      startedOnceRef.current = true;
      start();
    }

    const handlePageHide = () => {
      if (!finishedRef.current) broadcast("closed");
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      channel.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const handleStopClick = () => {
    stopRequestedRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      <p className="text-sm">{status}</p>
      {micFallback && (
        <p className="text-xs text-amber-300">Your microphone wasn't available — recording everyone else's audio only.</p>
      )}
      <button
        onClick={handleStopClick}
        disabled={!canStop}
        className="mt-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium"
      >
        Stop Recording
      </button>
    </div>
  );
}
