import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckSquare, AtSign, Sparkles, UserRound, Video, UsersRound, ShieldPlus, Mail, KeyRound } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/types/notification";

function notificationIcon(type: Notification["type"]) {
  switch (type) {
    case "task_assigned":
      return <CheckSquare className="w-4 h-4" />;
    case "mentioned":
      return <AtSign className="w-4 h-4" />;
    case "meeting_summary_ready":
      return <Sparkles className="w-4 h-4" />;
    case "profile_incomplete":
      return <UserRound className="w-4 h-4" />;
    case "recording_ready":
      return <Video className="w-4 h-4" />;
    case "team_join_request":
      return <KeyRound className="w-4 h-4" />;
    case "team_invite":
      return <Mail className="w-4 h-4" />;
    case "team_join_accepted":
    case "team_join_rejected":
    case "team_invite_accepted":
    case "team_invite_rejected":
      return <UsersRound className="w-4 h-4" />;
    case "team_promoted":
      return <ShieldPlus className="w-4 h-4" />;
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n._id);
    setOpen(false);
    if (n.meetingId) {
      navigate(`/meeting/${n.meetingId}/summary`);
    } else if (n.type === "profile_incomplete") {
      navigate("/profile");
    } else if (n.type === "team_invite") {
      // invites are accepted/rejected from the Workspace pending-invites banner, not Manage
      // Team — the invited user isn't a member yet
      navigate("/workspace");
    } else if (n.teamId && (n.type === "team_join_request" || n.type === "team_invite_accepted" || n.type === "team_invite_rejected")) {
      navigate(`/workspace?team=${n.teamId}&manage=1`);
    } else if (n.teamId && (n.type === "team_join_accepted" || n.type === "team_promoted")) {
      navigate(`/workspace?team=${n.teamId}`);
    } else if (n.type === "team_join_rejected") {
      navigate("/workspace");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0",
                    !n.read && "bg-blue-50/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    {notificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
