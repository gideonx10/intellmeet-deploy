export interface Notification {
  _id: string;
  recipient: string;
  type:
    | "task_assigned"
    | "mentioned"
    | "meeting_summary_ready"
    | "profile_incomplete"
    | "recording_ready"
    | "team_join_request"
    | "team_join_accepted"
    | "team_join_rejected"
    | "team_invite"
    | "team_invite_accepted"
    | "team_invite_rejected"
    | "team_promoted";
  message: string;
  meetingId?: string;
  teamId?: string;
  read: boolean;
  createdAt: string;
}
