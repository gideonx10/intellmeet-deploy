export default function LiveCaptionsBar({ transcript }: { transcript: string }) {
  return (
    <div className="bg-black/70 text-white text-sm px-6 py-2 max-h-24 overflow-y-auto">
      {transcript}
    </div>
  );
}
