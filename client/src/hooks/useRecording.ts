import { useEffect, useRef, useState } from "react";

export const useRecording = (
  myStreamRef: React.MutableRefObject<MediaStream | null>,
  onStop?: (blob: Blob) => void,
  showToast?: (message: string, durationMs?: number) => void
) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    compositeStreamRef.current?.getTracks().forEach((t) => t.stop());
    compositeStreamRef.current = null;
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    cleanup();
  };

  const startRecording = async () => {
    if (!myStreamRef.current) return;
    chunksRef.current = [];

    let displayStream: MediaStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: true,
      });
    } catch {
      showToast?.("Recording cancelled");
      return;
    }

    const videoTrack = displayStream.getVideoTracks()[0];
    if (!videoTrack) {
      displayStream.getTracks().forEach((t) => t.stop());
      showToast?.("Recording failed — no video was shared");
      return;
    }

    const settings = videoTrack.getSettings() as MediaTrackSettings & { displaySurface?: string };
    if (settings.displaySurface !== "browser") {
      displayStream.getTracks().forEach((t) => t.stop());
      showToast?.('Please pick "Chrome Tab" and select this meeting\'s tab, then try again', 4500);
      return;
    }

    displayStreamRef.current = displayStream;
    videoTrack.onended = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        stopRecording();
      }
    };

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
    connectAudio(myStreamRef.current);

    const composite = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()]);
    compositeStreamRef.current = composite;

    const recorder = new MediaRecorder(composite, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onStop?.(blob);
    };

    recorder.start(1000);
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
    };
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return {
    isRecording,
    recordingTime: formatTime(recordingTime),
    toggleRecording,
  };
};
