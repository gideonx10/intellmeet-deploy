import { Plus, Users2, KeyRound, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Team } from "@/types/team";

export default function TeamSwitcher({
  teams,
  selectedTeam,
  selectedTeamId,
  onSelectTeam,
  onManageTeam,
  onJoinTeam,
  onCreateTeam,
}: {
  teams: Team[] | undefined;
  selectedTeam: Team | null;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  onManageTeam: () => void;
  onJoinTeam: () => void;
  onCreateTeam: () => void;
}) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      {teams && teams.length > 0 && (
        <>
          {teams.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg pl-3 pr-2.5 py-2 hover:border-slate-300 hover:bg-slate-50 transition-colors data-[state=open]:border-blue-300 data-[state=open]:ring-2 data-[state=open]:ring-blue-100">
                  <span>{selectedTeam?.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-50">
                {teams.map((t) => (
                  <DropdownMenuItem
                    key={t._id}
                    onClick={() => onSelectTeam(t._id)}
                    className={t._id === selectedTeamId ? "bg-blue-50 text-blue-700 font-medium" : ""}
                  >
                    <span className="flex-1 truncate">{t.name}</span>
                    {t._id === selectedTeamId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm text-slate-600 font-medium">{selectedTeam?.name}</span>
          )}
          <Button variant="outline" size="sm" onClick={onManageTeam}>
            <Users2 className="w-4 h-4 mr-1" /> Manage team
          </Button>
        </>
      )}
      <Button variant="outline" size="sm" onClick={onJoinTeam}>
        <KeyRound className="w-4 h-4 mr-1" /> Join a team
      </Button>
      <Button variant="outline" size="sm" onClick={onCreateTeam}>
        <Plus className="w-4 h-4 mr-1" /> Create a team
      </Button>
    </div>
  );
}
