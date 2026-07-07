import { isAxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActionItemRow from "./ActionItemRow";
import type { ActionItem } from "@/types/meeting";
import type { Team } from "@/types/team";

export default function ActionItemsList({
  actionItems,
  createTaskError,
  noTeams,
  teams,
  openItemId,
  formTeamId,
  formAssignee,
  formDueDate,
  formTeam,
  creatingTask,
  onToggleDone,
  onOpenConvertForm,
  onCloseForm,
  onFormTeamChange,
  onFormAssigneeChange,
  onFormDueDateChange,
  onConvert,
}: {
  actionItems: ActionItem[];
  createTaskError: unknown;
  noTeams: boolean;
  teams: Team[] | undefined;
  openItemId: string | null;
  formTeamId: string;
  formAssignee: string;
  formDueDate: string;
  formTeam: Team | undefined;
  creatingTask: boolean;
  onToggleDone: (itemId: string) => void;
  onOpenConvertForm: (item: ActionItem) => void;
  onCloseForm: () => void;
  onFormTeamChange: (teamId: string) => void;
  onFormAssigneeChange: (userId: string) => void;
  onFormDueDateChange: (date: string) => void;
  onConvert: (item: ActionItem) => void;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Action Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {Boolean(createTaskError) && (
          <p className="text-xs text-red-500 mb-2">
            {isAxiosError(createTaskError)
              ? createTaskError.response?.data?.message || "Failed to create task"
              : "Failed to create task"}
          </p>
        )}
        {actionItems.length === 0 ? (
          <p className="text-sm text-slate-400">No action items identified.</p>
        ) : (
          actionItems.map((item) => (
            <ActionItemRow
              key={item._id}
              item={item}
              isOpen={openItemId === item._id}
              noTeams={noTeams}
              teams={teams}
              formTeamId={formTeamId}
              formAssignee={formAssignee}
              formDueDate={formDueDate}
              formTeam={formTeam}
              creatingTask={creatingTask}
              onToggleDone={onToggleDone}
              onOpenConvertForm={onOpenConvertForm}
              onCloseForm={onCloseForm}
              onFormTeamChange={onFormTeamChange}
              onFormAssigneeChange={onFormAssigneeChange}
              onFormDueDateChange={onFormDueDateChange}
              onConvert={onConvert}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
