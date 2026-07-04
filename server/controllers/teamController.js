import Team from '../models/Team.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket/io.js';

// members.user is a raw ObjectId before populate, a full doc after — sanitize runs post-populate,
// most mutations check admin-ness before, so handle both
const memberUserId = (m) => (m.user && m.user._id ? m.user._id.toString() : m.user.toString());

const isTeamAdmin = (team, userId) =>
  team.members.some((m) => memberUserId(m) === userId.toString() && m.role === 'admin');

const TEAM_POPULATE = [
  { path: 'admin', select: 'name email avatar' },
  { path: 'members.user', select: 'name email avatar' },
  { path: 'joinRequests.user', select: 'name email avatar' },
  { path: 'invites.invitedBy', select: 'name' },
];

const notify = async (recipientId, type, message, teamId) => {
  const notification = await Notification.create({ recipient: recipientId, type, message, teamId });
  const io = getIO();
  if (io) io.emit('notification', { ...notification.toObject(), toUserId: notification.recipient.toString() });
};

const notifyAdmins = async (team, type, message) => {
  const admins = team.members.filter((m) => m.role === 'admin');
  await Promise.all(admins.map((a) => notify(a.user, type, message, team._id)));
};

// The join code, pending join requests, and pending invites are only ever meant to be seen
// by a team's admin(s) via Manage Team — stripped from the response for regular members.
const sanitizeTeamForUser = (team, userId) => {
  const plain = team.toObject ? team.toObject() : team;
  if (!isTeamAdmin(team, userId)) {
    delete plain.joinCode;
    delete plain.joinRequests;
    delete plain.invites;
  }
  return plain;
};

// POST /api/teams
export const createTeam = async (req, res) => {
  try {
    const { name } = req.body;

    const team = await Team.create({
      name,
      admin: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    await team.populate(TEAM_POPULATE);

    res.status(201).json({ message: 'Team created', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teams — teams the logged-in user belongs to
export const getMyTeams = async (req, res) => {
  try {
    let query = Team.find({ 'members.user': req.user._id }).sort({ createdAt: -1 });
    TEAM_POPULATE.forEach((p) => { query = query.populate(p); });
    const teams = await query;

    res.status(200).json({ teams: teams.map((t) => sanitizeTeamForUser(t, req.user._id)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teams/:id
export const getTeam = async (req, res) => {
  try {
    let query = Team.findById(req.params.id);
    TEAM_POPULATE.forEach((p) => { query = query.populate(p); });
    const team = await query;

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some((m) => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    res.status(200).json({ team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teams/:id — admin-only rename
export const renameTeam = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Only a team admin can rename the team' });
    }

    team.name = name.trim();
    await team.save();
    await team.populate(TEAM_POPULATE);

    res.status(200).json({ message: 'Team renamed', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teams/:id/members/:userId/promote — any current admin can promote a member
export const promoteMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Only a team admin can promote members' });
    }

    const member = team.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: 'User is not a member of this team' });
    }
    if (member.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    member.role = 'admin';
    await team.save();
    await team.populate(TEAM_POPULATE);

    await notify(userId, 'team_promoted', `You've been promoted to admin in Team ${team.name}`, team._id);

    res.status(200).json({ message: 'Member promoted', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/teams/:id/members/:userId — any admin can remove anyone but the original owner;
// a member can remove themselves (leave the team)
export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isAdmin = isTeamAdmin(team, req.user._id);
    const isSelf = req.user._id.toString() === userId;

    if (userId === team.admin.toString()) {
      return res.status(400).json({ message: 'Team admin cannot be removed' });
    }
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Not authorized to remove this member' });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();
    await team.populate(TEAM_POPULATE);

    res.status(200).json({ message: 'Member removed', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/join — request to join a team by its (admin-only-visible) join code.
// Never adds the requester directly — creates a pending request for an admin to act on.
export const joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Join code is required' });
    }

    const team = await Team.findOne({ joinCode: code.trim().toUpperCase() });
    if (!team) {
      return res.status(404).json({ message: 'Invalid code' });
    }

    if (team.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }
    if (team.joinRequests.some((r) => r.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You already have a pending request to join this team' });
    }

    team.joinRequests.push({ user: req.user._id });
    await team.save();

    await notifyAdmins(team, 'team_join_request', `${req.user.name} wants to join Team ${team.name}`);

    res.status(201).json({ message: 'Request sent', teamName: team.name, teamId: team._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/:id/join-requests/:userId/accept — admin only
export const acceptJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Only a team admin can accept join requests' });
    }
    if (!team.joinRequests.some((r) => r.user.toString() === userId)) {
      return res.status(404).json({ message: 'No pending request from this user' });
    }

    team.joinRequests = team.joinRequests.filter((r) => r.user.toString() !== userId);
    if (!team.members.some((m) => m.user.toString() === userId)) {
      team.members.push({ user: userId, role: 'member' });
    }
    await team.save();
    await team.populate(TEAM_POPULATE);

    await notify(userId, 'team_join_accepted', `Your request to join Team ${team.name} was accepted`, team._id);

    res.status(200).json({ message: 'Request accepted', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/:id/join-requests/:userId/reject — admin only
export const rejectJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Only a team admin can reject join requests' });
    }
    if (!team.joinRequests.some((r) => r.user.toString() === userId)) {
      return res.status(404).json({ message: 'No pending request from this user' });
    }

    team.joinRequests = team.joinRequests.filter((r) => r.user.toString() !== userId);
    await team.save();
    await team.populate(TEAM_POPULATE);

    await notify(userId, 'team_join_rejected', `Your request to join Team ${team.name} was rejected`, team._id);

    res.status(200).json({ message: 'Request rejected', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/:id/invites — admin only, invite an existing registered user by exact email
export const inviteByEmail = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Only a team admin can invite members' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      return res.status(404).json({ message: 'No registered user with that email' });
    }
    if (team.members.some((m) => m.user.toString() === invitedUser._id.toString())) {
      return res.status(400).json({ message: 'User is already a member of this team' });
    }
    if (team.invites.some((i) => i.email === email)) {
      return res.status(400).json({ message: 'This email has already been invited' });
    }

    team.invites.push({ email, invitedBy: req.user._id });
    await team.save();
    await team.populate(TEAM_POPULATE);

    await notify(invitedUser._id, 'team_invite', `You've been invited to join Team ${team.name}`, team._id);

    res.status(200).json({ message: 'Invite sent', team: sanitizeTeamForUser(team, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teams/invites/me — pending invites addressed to the logged-in user's email, across all teams
export const getMyInvites = async (req, res) => {
  try {
    const teams = await Team.find({ 'invites.email': req.user.email });
    const invites = teams.map((team) => {
      const invite = team.invites.find((i) => i.email === req.user.email);
      return { teamId: team._id, teamName: team.name, invitedAt: invite?.invitedAt };
    });

    res.status(200).json({ invites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/:id/invites/accept — invited user accepts, matched by their own email
export const acceptInvite = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const invite = team.invites.find((i) => i.email === req.user.email);
    if (!invite) {
      return res.status(404).json({ message: 'No pending invite for you on this team' });
    }

    team.invites = team.invites.filter((i) => i.email !== req.user.email);
    if (!team.members.some((m) => m.user.toString() === req.user._id.toString())) {
      team.members.push({ user: req.user._id, role: 'member' });
    }
    await team.save();

    await notifyAdmins(team, 'team_invite_accepted', `${req.user.name} accepted the invite to join Team ${team.name}`);

    res.status(200).json({ message: 'Invite accepted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/teams/:id/invites/reject — invited user rejects, matched by their own email
export const rejectInvite = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const invite = team.invites.find((i) => i.email === req.user.email);
    if (!invite) {
      return res.status(404).json({ message: 'No pending invite for you on this team' });
    }

    team.invites = team.invites.filter((i) => i.email !== req.user.email);
    await team.save();

    await notifyAdmins(team, 'team_invite_rejected', `${req.user.name} declined the invite to join Team ${team.name}`);

    res.status(200).json({ message: 'Invite rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
