import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/task";

export default function MeetingTasksList({ tasks }: { tasks: Task[] }) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tasks from this meeting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {tasks.map((task) => (
          <div key={task._id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
            <p className="text-sm text-slate-800">{task.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                {task.assignee.name}
              </span>
              <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 capitalize">
                {task.status.replace("-", " ")}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
