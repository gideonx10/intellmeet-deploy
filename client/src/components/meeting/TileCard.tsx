import { useEffect, useRef } from "react";
import { MicOff, Monitor } from "lucide-react";

export type Tile = {
  key: string;
  kind: "camera" | "screen";
  userName: string;
  isMe: boolean;
  stream?: MediaStream | null;
  micOn?: boolean;
  camOn?: boolean;
};

function RemoteVideo({ stream }: { stream: MediaStream | null | undefined }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}

function ScreenPreview({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="w-full h-full object-contain" />;
}

export default function TileCard({
  tile,
  myVideoRef,
  className,
}: {
  tile: Tile;
  myVideoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}) {
  return (
    <div className={`relative bg-slate-800 rounded-xl overflow-hidden ${className || ""}`}>
      {tile.kind === "screen" ? (
        tile.isMe ? <ScreenPreview stream={tile.stream!} /> : <RemoteVideo stream={tile.stream} />
      ) : tile.isMe ? (
        <video ref={myVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      ) : (
        <RemoteVideo stream={tile.stream} />
      )}

      {tile.kind === "camera" && !tile.camOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold">
            {tile.userName?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
      )}

      {tile.kind === "screen" && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Monitor className="w-3 h-3" /> Presenting
        </div>
      )}

      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        {tile.userName} {tile.isMe ? "(You)" : ""} {tile.kind === "screen" ? "— screen" : ""}
      </div>

      {tile.kind === "camera" && !tile.micOn && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <MicOff className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
