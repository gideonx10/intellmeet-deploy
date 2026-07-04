import { useRef, useState } from "react";
import type Peer from "simple-peer";

type PeerRefEntry = {
  peer: Peer.Instance;
};

export const useScreenShare = (peersRef: React.MutableRefObject<Map<string, PeerRefEntry>>) => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screenStream;
      setScreenStream(screenStream);
      const screenTrack = screenStream.getVideoTracks()[0];

      // added as its own stream, not swapped into the camera's sender, so toggling the
      // camera has zero effect on the share and vice versa
      peersRef.current.forEach(({ peer }) => {
        if (!peer.destroyed) peer.addStream(screenStream);
      });

      setIsSharing(true);

      // When user stops sharing via the browser's native "Stop sharing" button
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = async () => {
    const stream = screenStreamRef.current;
    if (stream) {
      peersRef.current.forEach(({ peer }) => {
        if (!peer.destroyed) {
          try {
            peer.removeStream(stream);
          } catch {
            // peer may already be tearing down (remote left mid-share) — fine
          }
        }
      });
      stream.getTracks().forEach((t) => t.stop());
    }

    screenStreamRef.current = null;
    setScreenStream(null);
    setIsSharing(false);
  };

  const toggleScreenShare = () => (isSharing ? stopScreenShare() : startScreenShare());

  return { isSharing, screenStream, toggleScreenShare };
};
