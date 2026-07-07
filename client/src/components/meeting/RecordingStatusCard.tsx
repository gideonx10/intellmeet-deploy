import { Loader2, Video, VideoOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Meeting } from "@/types/meeting";

export default function RecordingStatusCard({
  recordingStatus,
  recordingUrl,
}: {
  recordingStatus: Meeting["recordingStatus"];
  recordingUrl: Meeting["recordingUrl"];
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recording</CardTitle>
      </CardHeader>
      <CardContent>
        {recordingStatus === "processing" && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            The recording will be available shortly.
          </div>
        )}
        {recordingStatus === "failed" && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <VideoOff className="w-4 h-4 shrink-0" />
            This meeting's recording couldn't be saved.
          </div>
        )}
        {recordingStatus === "ready" && recordingUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Video className="w-4 h-4 shrink-0" />
              Watch Recording
            </div>
            <video controls src={recordingUrl} className="w-full rounded-lg border border-slate-200" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
