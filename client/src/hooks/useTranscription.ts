import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

// 12s chunks were tried for lower latency but gave Whisper less context per call and
// measurably increased hallucinated text — correctness matters more here than latency
const CHUNK_DURATION_MS = 30000;

// below this RMS a chunk is near-silent and skipped — quiet audio is exactly what makes
// Whisper invent phrases that were never said
const SILENCE_RMS_THRESHOLD = 0.015;

// too short to contain a real utterance regardless of energy — skip rather than risk it
const MIN_CHUNK_DURATION_SEC = 1.5;

async function isSilent(blob: Blob): Promise<boolean> {
  let audioCtx: AudioContext | undefined;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (audioBuffer.duration < MIN_CHUNK_DURATION_SEC) return true;

    const channelData = audioBuffer.getChannelData(0);
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) sumSquares += channelData[i] * channelData[i];
    const rms = Math.sqrt(sumSquares / channelData.length);

    return rms < SILENCE_RMS_THRESHOLD;
  } catch {
    // can't analyze it — err on the side of sending it
    return false;
  } finally {
    audioCtx?.close();
  }
}

export const useTranscription = (
  meetingId: string,
  myStreamRef: React.MutableRefObject<MediaStream | null>
) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const activeRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) return;
      if (await isSilent(blob)) return;

      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");

      try {
        const { data } = await api.post(`/ai/transcribe/${meetingId}`, formData, {
          headers: { "Content-Type": undefined },
        });
        if (data.transcript) {
          setTranscript((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
        }
      } catch (err) {
        console.error("Transcription chunk failed:", err);
      }
    },
    [meetingId]
  );

  // each chunk is its own start/stop cycle so every blob is a self-contained webm file —
  // a single MediaRecorder timeslice only puts container headers on the first chunk
  const recordChunk = useCallback(
    (audioStream: MediaStream) => {
      // capture starts right as the mic track is acquired, so it can occasionally still be
      // settling and make MediaRecorder.start() throw — retry instead of killing the pipeline
      if (audioStream.getAudioTracks().every((t) => t.readyState === "ended")) {
        activeRef.current = false;
        setIsTranscribing(false);
        return;
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
        recorder.start();
      } catch (err) {
        console.error("MediaRecorder failed to start, retrying:", err);
        timerRef.current = setTimeout(() => {
          if (activeRef.current) recordChunk(audioStream);
        }, 500);
        return;
      }

      const parts: Blob[] = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) parts.push(e.data);
      };

      recorder.onstop = () => {
        sendChunk(new Blob(parts, { type: "audio/webm" }));
        if (activeRef.current) recordChunk(audioStream);
      };

      timerRef.current = setTimeout(() => recorder.stop(), CHUNK_DURATION_MS);
    },
    [sendChunk]
  );

  // runs for the whole meeting regardless of whether the caption bar is shown — idempotent,
  // safe to call again (StrictMode double-invoke etc)
  const startTranscription = useCallback(() => {
    if (activeRef.current) return;

    const audioTracks = myStreamRef.current?.getAudioTracks() ?? [];
    if (audioTracks.length === 0) return;

    activeRef.current = true;
    setIsTranscribing(true);
    recordChunk(new MediaStream(audioTracks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordChunk]);

  // stop the capture loop on unmount, or the chunk timer keeps firing against stopped tracks
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      recorderRef.current?.stop();
    };
  }, []);

  return { isTranscribing, transcript, startTranscription };
};
