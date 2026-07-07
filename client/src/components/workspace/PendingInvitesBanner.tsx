import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MyTeamInvite } from "@/types/team";

export default function PendingInvitesBanner({
  invites,
  accepting,
  rejecting,
  onAccept,
  onReject,
}: {
  invites: MyTeamInvite[];
  accepting: boolean;
  rejecting: boolean;
  onAccept: (teamId: string) => void;
  onReject: (teamId: string) => void;
}) {
  return (
    <Card className="border border-blue-200 bg-blue-50/50 shadow-sm mb-6">
      <CardContent className="py-4 space-y-2">
        <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Pending team invites
        </p>
        {invites.map((inv) => (
          <div key={inv.teamId} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2">
            <p className="text-sm text-slate-800">
              You've been invited to join <span className="font-medium">{inv.teamName}</span>
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" disabled={accepting || rejecting} onClick={() => onAccept(inv.teamId)}>
                Accept
              </Button>
              <Button size="sm" variant="ghost" disabled={accepting || rejecting} onClick={() => onReject(inv.teamId)}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
