export default function ControlBtn({
  onClick,
  active,
  icon,
  badge,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-colors ${active ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
    >
      {icon}
      {!!badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
