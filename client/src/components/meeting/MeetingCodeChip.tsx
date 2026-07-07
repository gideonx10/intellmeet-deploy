import { Copy } from "lucide-react";

export default function MeetingCodeChip({ meetingCode, onCopy }: { meetingCode: string; onCopy: () => void }) {
  return (
    <button
      onClick={onCopy}
      title="Copy meeting code"
      className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
    >
      <Copy className="w-3.5 h-3.5" />
      <span className="font-mono tracking-widest">{meetingCode}</span>
    </button>
  );
}
