import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Peer from "simple-peer";
import { useSocket } from "@/socket/useSocket";
import { useAuthStore } from "@/store/authStore";
import { Sparkles, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from "lucide-react";
import ChatPanel from "@/components/meeting/ChatPanel";
import ParticipantsList from "@/components/meeting/ParticipantsList";
import InMeetingTaskPanel from "@/components/meeting/InMeetingTaskPanel";
import TileCard, { type Tile } from "@/components/meeting/TileCard";
import MeetingCodeChip from "@/components/meeting/MeetingCodeChip";
import LiveCaptionsBar from "@/components/meeting/LiveCaptionsBar";
import RecordingConfirmDialogs from "@/components/meeting/RecordingConfirmDialogs";
import MeetingControlBar from "@/components/meeting/MeetingControlBar";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useRecording } from "@/hooks/useRecording";
import { useTranscription } from "@/hooks/useTranscription";
import { useEndMeeting, useGetMeeting, useStartMeeting } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { ToastStack } from "@/components/ui/toast";

interface PeerData {
  peer: Peer.Instance;
  socketId: string;
  userName: string;
  stream?: MediaStream;
  screenStream?: MediaStream;
  micOn: boolean;
  camOn: boolean;
}

export default function VideoRoomPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const socket = useSocket();
  const { user } = useAuthStore();
  
  const navigate = useNavigate();

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerData>>(new Map());
  const { isSharing, screenStream, toggleScreenShare } = useScreenShare(peersRef);
  const { isTranscribing, transcript, startTranscription } = useTranscription(id!, myStreamRef);
  const { data: meeting } = useGetMeeting(id!);
  const { mutate: endMeeting } = useEndMeeting();
  const { mutate: startMeeting } = useStartMeeting(id!);
  const isHost = meeting?.host?._id === user?.id;
  const { toasts, showToast } = useToast();

  useEffect(() => {
    document.title = meeting?.title ? `${meeting.title} — IntellMeet` : "IntellMeet";
    return () => {
      document.title = "IntellMeet";
    };
  }, [meeting?.title]);

  // guards against StrictMode's double-invoke — both would otherwise see status "scheduled"
  // and both fire startMeeting, racing two saves on the same document
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (isHost && meeting?.status === "scheduled") {
      hasStartedRef.current = true;
      startMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, meeting?.status]);

  const [peers, setPeers] = useState<PeerData[]>([]);
  const [micOn, setMicOn] = useState(searchParams.get("mic") !== "false");
  const [camOn, setCamOn] = useState(searchParams.get("cam") !== "false");
  const [openPanel, setOpenPanel] = useState<"participants" | "chat" | "tasks" | null>(null);
  // just shows/hides the caption bar — doesn't touch capture
  const [showCaptions, setShowCaptions] = useState(false);
  const [transcriptionActiveAnywhere, setTranscriptionActiveAnywhere] = useState(false);
  const [recordingActiveAnywhere, setRecordingActiveAnywhere] = useState(false);
  const [stripHidden, setStripHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStartRecordingConfirm, setShowStartRecordingConfirm] = useState(false);
  const [showStopRecordingConfirm, setShowStopRecordingConfirm] = useState(false);
  const bigTileRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleParticipants = () => setOpenPanel((p) => (p === "participants" ? null : "participants"));
  const toggleChat = () => setOpenPanel((p) => (p === "chat" ? null : "chat"));
  const toggleTasks = () => setOpenPanel((p) => (p === "tasks" ? null : "tasks"));

  const roomId = id!;

  // read from inside the socket effect's closures, which wouldn't see isTranscribing update otherwise
  const isTranscribingRef = useRef(false);
  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  const { isRecording, recordingTime, toggleRecording } = useRecording(id!, showToast);

  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const [streamReady, setStreamReady] = useState(false);

  // waits for the meeting to load before deciding, so a fast getUserMedia can't win a race
  // against the meeting fetch and start transcription before aiEnabled is known
  useEffect(() => {
    if (!streamReady || !meeting) return;
    if (meeting.aiEnabled === false) return;
    startTranscription();
  }, [streamReady, meeting, startTranscription]);

  // announces once capture starts so remote indicators pick it up — the server's broadcast
  // excludes the sender, so a solo participant needs the local isTranscribing check too (below)
  useEffect(() => {
    if (isTranscribing) socket?.emit("transcription-active", { roomId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing]);

  // first 'stream' event per peer is camera+mic, a second one (via addStream for screen share)
  // arrives later — route by arrival order so a share never overwrites the camera feed
  const handleStream = useCallback((socketId: string, stream: MediaStream) => {
    setPeers((prev) =>
      prev.map((p) => {
        if (p.socketId !== socketId) return p;
        if (!p.stream) return { ...p, stream };
        return { ...p, screenStream: stream };
      })
    );
  }, []);

  useEffect(() => {
    if (!socket) return;

    // getUserMedia outlives StrictMode's dev remount — without this, a stale run can finish
    // after cleanup and still join, creating an orphaned peer connection
    let cancelled = false;

    const initMedia = async () => {
      // always request both tracks — the lobby's choice only sets the initial enabled state,
      // otherwise there's nothing for toggleMic/toggleCam to flip later
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          console.warn("No media access");
        }
      }

      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        myStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        setStreamReady(true);
      }

      if (cancelled) return;

      socket.emit("join-room", { roomId, userId: user?.id, userName: user?.name, micOn, camOn });
    };

    initMedia();

    // Someone already in room — we initiate the call to them
    socket.on(
      "room-participants",
      (participants: { socketId: string; userName: string; micOn?: boolean; camOn?: boolean }[]) => {
        participants.forEach(({ socketId, userName, micOn: peerMicOn, camOn: peerCamOn }) => {
          if (peersRef.current.has(socketId)) return;
          const peer = new Peer({ initiator: true, trickle: true, stream: myStreamRef.current || undefined });

          peer.on("signal", (signal) => socket.emit("offer", { to: socketId, offer: signal }));
          peer.on("stream", (stream) => handleStream(socketId, stream));
          peer.on("error", (e) => console.error("Peer error", e));

          const peerData = { peer, socketId, userName, micOn: peerMicOn ?? true, camOn: peerCamOn ?? true };
          peersRef.current.set(socketId, peerData);
          setPeers((prev) => [...prev, peerData]);
        });
      }
    );

    // New peer joined — they initiate; we answer
    socket.on(
      "user-joined",
      ({
        socketId,
        userName,
        micOn: peerMicOn,
        camOn: peerCamOn,
      }: {
        socketId: string;
        userName: string;
        micOn?: boolean;
        camOn?: boolean;
      }) => {
        if (peersRef.current.has(socketId)) return;
        const peer = new Peer({ initiator: false, trickle: true, stream: myStreamRef.current || undefined });

        peer.on("signal", (signal) => socket.emit("answer", { to: socketId, answer: signal }));
        peer.on("stream", (stream) => handleStream(socketId, stream));
        peer.on("error", (e) => console.error("Peer error", e));

        // a late joiner wouldn't otherwise know transcription is active until their own mic
        // capture kicks in — re-announce so their indicator shows up immediately
        if (isTranscribingRef.current) socket.emit("transcription-active", { roomId });
        if (isRecordingRef.current) socket.emit("recording-started", { roomId });

        const peerData = { peer, socketId, userName, micOn: peerMicOn ?? true, camOn: peerCamOn ?? true };
        peersRef.current.set(socketId, peerData);
        setPeers((prev) => [...prev, peerData]);
      }
    );

    // Remote peer toggled mic/camera
    socket.on(
      "media-state-changed",
      ({ socketId, micOn: peerMicOn, camOn: peerCamOn }: { socketId: string; micOn: boolean; camOn: boolean }) => {
        const entry = peersRef.current.get(socketId);
        if (entry) peersRef.current.set(socketId, { ...entry, micOn: peerMicOn, camOn: peerCamOn });
        setPeers((prev) =>
          prev.map((p) => (p.socketId === socketId ? { ...p, micOn: peerMicOn, camOn: peerCamOn } : p))
        );
      }
    );

    // explicit signal rather than inferring from track-ended (flakier across browsers) — the
    // actual video arrives separately via handleStream, this just shows/hides the tile
    socket.on(
      "screen-share-changed",
      ({ socketId, isSharing: peerIsSharing }: { socketId: string; isSharing: boolean }) => {
        if (peerIsSharing) return;
        const entry = peersRef.current.get(socketId);
        if (entry) peersRef.current.set(socketId, { ...entry, screenStream: undefined });
        setPeers((prev) =>
          prev.map((p) => (p.socketId === socketId ? { ...p, screenStream: undefined } : p))
        );
      }
    );

    // Any participant's background capture becoming active — union across the whole meeting,
    // never reset false, since capture runs for the rest of the meeting once started.
    socket.on("transcription-active", () => setTranscriptionActiveAnywhere(true));

    socket.on("recording-started", () => {
      setRecordingActiveAnywhere(true);
      showToast("Recording has started");
    });

    socket.on("recording-stopped", () => {
      setRecordingActiveAnywhere(false);
      showToast("Recording has stopped");
    });

    // Receive offer — signal to existing peer
    socket.on("offer", ({ from, offer }: { from: string; offer: Peer.SignalData }) => {
      peersRef.current.get(from)?.peer.signal(offer);
    });

    // Receive answer
    socket.on("answer", ({ from, answer }: { from: string; answer: Peer.SignalData }) => {
      peersRef.current.get(from)?.peer.signal(answer);
    });

    // Receive ICE candidate
    socket.on("ice-candidate", ({ from, candidate }: { from: string; candidate: Peer.SignalData }) => {
      peersRef.current.get(from)?.peer.signal(candidate);
    });

    // Peer left
    socket.on("user-left", ({ socketId }: { socketId: string }) => {
      peersRef.current.get(socketId)?.peer.destroy();
      peersRef.current.delete(socketId);
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Host ended the meeting — everyone still in the room gets sent to the summary
    socket.on("meeting-ended", () => {
      navigate(`/meeting/${roomId}/summary`);
    });

    return () => {
      cancelled = true;
      socket.emit("leave-room", { roomId });
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach(({ peer }) => peer.destroy());
      peersRef.current.clear();
      socket.off("room-participants");
      socket.off("user-joined");
      socket.off("media-state-changed");
      socket.off("screen-share-changed");
      socket.off("transcription-active");
      socket.off("recording-started");
      socket.off("recording-stopped");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
      socket.off("meeting-ended");
    };
  }, [socket]);

  const toggleMic = () => {
    const next = !micOn;
    myStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    socket?.emit("media-state-changed", { roomId, micOn: next, camOn });
    showToast(next ? "Microphone unmuted" : "Microphone muted");
  };

  const toggleCam = async () => {
    if (camOn) {
      // stop the track outright (not just disable it) so the camera LED actually turns off,
      // matching Meet/Zoom — stays referenced until replaced since it can't be re-enabled
      myStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      setCamOn(false);
      socket?.emit("media-state-changed", { roomId, micOn, camOn: false });
      showToast("Camera turned off");
      return;
    }

    const oldTrack = myStreamRef.current?.getVideoTracks()[0];
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newTrack = newStream.getVideoTracks()[0];

      if (myStreamRef.current) {
        peersRef.current.forEach(({ peer }) => {
          try {
            // swaps the sender's track in place — no renegotiation needed, unlike screen
            // share's addStream/removeStream (different media kind)
            if (oldTrack) peer.replaceTrack(oldTrack, newTrack, myStreamRef.current!);
            else peer.addTrack(newTrack, myStreamRef.current!);
          } catch (e) {
            console.error("Failed to replace video track on a peer:", e);
          }
        });

        if (oldTrack) myStreamRef.current.removeTrack(oldTrack);
        myStreamRef.current.addTrack(newTrack);
      }

      if (myVideoRef.current) myVideoRef.current.srcObject = myStreamRef.current;

      setCamOn(true);
      socket?.emit("media-state-changed", { roomId, micOn, camOn: true });
      showToast("Camera turned on");
    } catch (err) {
      console.error("Failed to re-acquire camera:", err);
      showToast("Couldn't turn the camera back on — check camera permissions");
    }
  };

  // toast off the resulting state, not the click — share/recording/captions can each fail
  // silently (permission denied etc), so a click doesn't always mean the state changed
  const mountedTogglesRef = useRef({ share: false, rec: false, cc: false });

  useEffect(() => {
    if (!mountedTogglesRef.current.share) {
      mountedTogglesRef.current.share = true;
      return;
    }
    socket?.emit("screen-share-changed", { roomId, isSharing });
    showToast(isSharing ? "You're sharing your screen" : "Screen sharing stopped");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharing, showToast]);

  useEffect(() => {
    if (!mountedTogglesRef.current.rec) {
      mountedTogglesRef.current.rec = true;
      return;
    }
    socket?.emit(isRecording ? "recording-started" : "recording-stopped", { roomId });
    showToast(isRecording ? "Recording started" : "Recording stopped — uploading in the background");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, showToast]);

  useEffect(() => {
    if (!mountedTogglesRef.current.cc) {
      mountedTogglesRef.current.cc = true;
      return;
    }
    // Purely about the caption bar's visibility now — background capture isn't affected.
    showToast(showCaptions ? "Live captions shown" : "Live captions hidden");
  }, [showCaptions, showToast]);

  const copyMeetingCode = () => {
    if (!meeting?.meetingCode) return;
    navigator.clipboard.writeText(meeting.meetingCode);
    showToast("Meeting code copied to clipboard");
  };

  const handleLeave = () => {
    if (isHost && isRecording) toggleRecording();
    socket?.emit("leave-room", { roomId });
    myStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (isHost) {
      endMeeting(id!);
    } else {
      navigate("/dashboard");
    }
  };


  // separate from `tiles` below, which also includes synthetic screen-share entries
  const allPeople = [
    { socketId: "me", userName: user?.name || "You", isMe: true, micOn, camOn },
    ...peers.map((p) => ({ socketId: p.socketId, userName: p.userName, isMe: false, micOn: p.micOn, camOn: p.camOn })),
  ];

  // screen share is always its own tile, never swapped in for someone's camera tile
  const tiles: Tile[] = [
    { key: "me", kind: "camera", userName: user?.name || "You", isMe: true, stream: null, micOn, camOn },
    ...(isSharing && screenStream ? [{ key: "me-screen", kind: "screen" as const, userName: user?.name || "You", isMe: true, stream: screenStream }] : []),
    ...peers.flatMap((p) => [
      { key: p.socketId, kind: "camera" as const, userName: p.userName, isMe: false, stream: p.stream, micOn: p.micOn, camOn: p.camOn },
      ...(p.screenStream ? [{ key: `${p.socketId}-screen`, kind: "screen" as const, userName: p.userName, isMe: false, stream: p.screenStream }] : []),
    ]),
  ];

  const screenTile = tiles.find((t) => t.kind === "screen");
  const stripTiles = tiles.filter((t) => t.key !== screenTile?.key);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      bigTileRef.current?.requestFullscreen();
    }
  };

  const toggleMeetingFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      rootRef.current?.requestFullscreen();
    }
  };

  const tileIsFullscreen = isFullscreen && document.fullscreenElement === bigTileRef.current;
  const meetingIsFullscreen = isFullscreen && document.fullscreenElement === rootRef.current;

  return (
    <div ref={rootRef} className="h-screen bg-slate-900 flex flex-col relative">
      <ToastStack toasts={toasts} />

      {isHost && meeting?.meetingCode && (
        <MeetingCodeChip meetingCode={meeting.meetingCode} onCopy={copyMeetingCode} />
      )}

      {(isTranscribing || transcriptionActiveAnywhere) && (
        <div
          title="Audio is being transcribed for this meeting's AI summary and action items"
          className="absolute top-4 right-4 z-40 flex items-center gap-1.5 bg-slate-800/80 text-blue-300 text-xs px-3 py-1.5 rounded-full border border-slate-700"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI is listening</span>
        </div>
      )}

      <RecordingConfirmDialogs
        showStartConfirm={showStartRecordingConfirm}
        onShowStartConfirmChange={setShowStartRecordingConfirm}
        showStopConfirm={showStopRecordingConfirm}
        onShowStopConfirmChange={setShowStopRecordingConfirm}
        onConfirmStart={toggleRecording}
        onConfirmStop={toggleRecording}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {screenTile ? (
          <div className="flex-1 flex min-h-0">
            <div
              ref={bigTileRef}
              className={`relative min-h-0 p-4 ${stripHidden ? "w-full" : "w-4/5"}`}
            >
              <TileCard tile={screenTile} myVideoRef={myVideoRef} className="w-full h-full" />
              <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                <button
                  onClick={() => setStripHidden((h) => !h)}
                  title={stripHidden ? "Show participants" : "Hide participants"}
                  className="w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center"
                >
                  {stripHidden ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  title={tileIsFullscreen ? "Exit full screen" : "Full screen shared content"}
                  className="w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center"
                >
                  {tileIsFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!stripHidden && (
              <div className="w-1/5 min-h-0 p-4 pl-0 flex flex-col gap-3 overflow-y-auto">
                {stripTiles.map((tile) => (
                  <TileCard key={tile.key} tile={tile} myVideoRef={myVideoRef} className="aspect-video shrink-0" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex-1 min-h-0 p-4 grid gap-3 content-start overflow-y-auto"
            style={{ gridTemplateColumns: `repeat(${Math.min(tiles.length, 3)}, 1fr)` }}
          >
            {tiles.map((tile) => (
              <TileCard key={tile.key} tile={tile} myVideoRef={myVideoRef} className="aspect-video" />
            ))}
          </div>
        )}

        <div
          className={`shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
            openPanel === "participants" ? "w-80 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="w-80 h-full">
            <ParticipantsList
              participants={allPeople.map(({ socketId, userName, isMe, micOn: pMicOn, camOn: pCamOn }) => ({
                socketId,
                userName,
                isMe,
                micOn: pMicOn,
                camOn: pCamOn,
              }))}
            />
          </div>
        </div>

        <div
          className={`shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
            openPanel === "chat" ? "w-80 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="w-80 h-full">
            <ChatPanel meetingId={id!} roomId={roomId} />
          </div>
        </div>

        <div
          className={`shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
            openPanel === "tasks" ? "w-80 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="w-80 h-full">
            <InMeetingTaskPanel meetingId={id!} />
          </div>
        </div>
      </div>

      {showCaptions && transcript && <LiveCaptionsBar transcript={transcript} />}

      <MeetingControlBar
        micOn={micOn}
        onToggleMic={toggleMic}
        camOn={camOn}
        onToggleCam={toggleCam}
        showCaptions={showCaptions}
        onToggleCaptions={() => setShowCaptions((s) => !s)}
        isSharing={isSharing}
        onToggleScreenShare={toggleScreenShare}
        isHost={isHost}
        isRecording={isRecording}
        recordingTime={recordingTime}
        recordingActiveAnywhere={recordingActiveAnywhere}
        onRecordClick={() => (isRecording ? setShowStopRecordingConfirm(true) : setShowStartRecordingConfirm(true))}
        openPanel={openPanel}
        onToggleParticipants={toggleParticipants}
        participantCount={allPeople.length}
        onToggleChat={toggleChat}
        onToggleTasks={toggleTasks}
        meetingIsFullscreen={meetingIsFullscreen}
        onToggleMeetingFullscreen={toggleMeetingFullscreen}
        onLeave={handleLeave}
      />
    </div>
  );
}