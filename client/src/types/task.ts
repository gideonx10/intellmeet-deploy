export interface Task {
  _id: string;
  title: string;
  description?: string;
  assignee: { _id: string; name: string; avatar?: string };
  team: string;
  meeting?: { _id: string; title: string };
  status: "todo" | "in-progress" | "done";
  dueDate?: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
}
