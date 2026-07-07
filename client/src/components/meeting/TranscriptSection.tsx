import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TranscriptSection({
  transcript,
  showTranscript,
  onToggle,
}: {
  transcript: string | undefined;
  showTranscript: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <button onClick={onToggle} className="w-full flex items-center justify-between text-left">
          <CardTitle className="text-base">Transcript</CardTitle>
          {showTranscript ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </CardHeader>
      {showTranscript && (
        <CardContent>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {transcript || "No transcript recorded"}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
