import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Monitor,
  Circle,
  Users,
  Captions,
  ListTodo,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ControlBtn from "./ControlBtn";

export default function MeetingControlBar({
  micOn,
  onToggleMic,
  camOn,
  onToggleCam,
  showCaptions,
  onToggleCaptions,
  isSharing,
  onToggleScreenShare,
  isHost,
  isRecording,
  recordingTime,
  recordingActiveAnywhere,
  onRecordClick,
  openPanel,
  onToggleParticipants,
  participantCount,
  onToggleChat,
  onToggleTasks,
  meetingIsFullscreen,
  onToggleMeetingFullscreen,
  onLeave,
}: {
  micOn: boolean;
  onToggleMic: () => void;
  camOn: boolean;
  onToggleCam: () => void;
  showCaptions: boolean;
  onToggleCaptions: () => void;
  isSharing: boolean;
  onToggleScreenShare: () => void;
  isHost: boolean;
  isRecording: boolean;
  recordingTime: string;
  recordingActiveAnywhere: boolean;
  onRecordClick: () => void;
  openPanel: "participants" | "chat" | "tasks" | null;
  onToggleParticipants: () => void;
  participantCount: number;
  onToggleChat: () => void;
  onToggleTasks: () => void;
  meetingIsFullscreen: boolean;
  onToggleMeetingFullscreen: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-center gap-4">
      <ControlBtn onClick={onToggleMic} active={micOn} icon={micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />} />
      <ControlBtn onClick={onToggleCam} active={camOn} icon={camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />} />
      <button
        onClick={onToggleCaptions}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${showCaptions ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
        title={showCaptions ? "Hide live captions" : "Show live captions"}
      >
        <Captions className="w-5 h-5" />
      </button>
      <button
        onClick={onToggleScreenShare}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSharing ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
        title={isSharing ? "Stop sharing" : "Share screen"}
      >
        <Monitor className="w-5 h-5" />
      </button>
      {isHost && (
        <button
          onClick={onRecordClick}
          className={`flex items-center gap-2 px-4 h-12 rounded-full transition-colors ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          <Circle className={`w-3 h-3 ${isRecording ? "fill-white animate-pulse" : "fill-slate-400"}`} />
          <span className="text-sm font-mono">{isRecording ? recordingTime : "REC"}</span>
        </button>
      )}
      {(isRecording || recordingActiveAnywhere) && (
        <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs px-3 h-8 rounded-full">
          <Circle className="w-2.5 h-2.5 fill-white animate-pulse" />
          <span>Recording</span>
        </div>
      )}
      <ControlBtn
        onClick={onToggleParticipants}
        active={openPanel !== "participants"}
        icon={<Users className="w-5 h-5" />}
        badge={participantCount}
      />
      <ControlBtn onClick={onToggleChat} active={openPanel !== "chat"} icon={<MessageSquare className="w-5 h-5" />} />
      <ControlBtn onClick={onToggleTasks} active={openPanel !== "tasks"} icon={<ListTodo className="w-5 h-5" />} />
      <button
        onClick={onToggleMeetingFullscreen}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${meetingIsFullscreen ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
        title={meetingIsFullscreen ? "Exit full screen" : "Full screen meeting"}
      >
        {meetingIsFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
      <button
        onClick={onLeave}
        title={isHost ? "End meeting for all" : "Leave meeting"}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
}
