export interface ActionItem {
  _id?: string;
  text: string;
  assignee: string;
  done: boolean;
  // set once converted to a task — reflects the task's live status, not the AI's suggestion
  taskId?: {
    _id: string;
    team: string;
    status: "todo" | "in-progress" | "done";
    dueDate?: string;
    assignee: { _id: string; name: string; avatar?: string };
  } | null;
}

export interface MeetingParticipant {
  user: { _id: string; name: string; avatar?: string };
  role: "host" | "participant";
  joinedAt?: string;
  leftAt?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  meetingCode: string;
  host: { _id: string; name: string; avatar?: string };
  participants: MeetingParticipant[];
  status: "scheduled" | "active" | "ended";
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  recordingUrl?: string | null;
  recordingStatus?: "none" | "processing" | "ready" | "failed";
  aiEnabled?: boolean;
  summary?: string;
  transcript?: string;
  actionItems: ActionItem[];
  createdAt: string;
}
