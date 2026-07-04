export interface TeamMember {
  user: { _id: string; name: string; email: string; avatar?: string };
  role: "admin" | "member";
}

export interface TeamJoinRequest {
  user: { _id: string; name: string; email: string; avatar?: string };
  requestedAt: string;
}

export interface TeamInvite {
  email: string;
  invitedBy: { _id: string; name: string };
  invitedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  admin: { _id: string; name: string; email: string; avatar?: string };
  members: TeamMember[];
  // only present for a team admin — stripped server-side otherwise
  joinCode?: string;
  joinRequests?: TeamJoinRequest[];
  invites?: TeamInvite[];
  createdAt: string;
}

// a pending invite addressed to the current user, shown on the Workspace page
export interface MyTeamInvite {
  teamId: string;
  teamName: string;
  invitedAt: string;
}
