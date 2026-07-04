import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const teamMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
}, { _id: false });

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Generated once at creation, same spirit as Meeting's meetingCode — never regenerated,
  // only ever surfaced to the team's admin(s) via Manage Team.
  joinCode: {
    type: String,
    unique: true,
    default: () => uuidv4().slice(0, 8).toUpperCase(),
  },
  members: [teamMemberSchema],
  joinRequests: [joinRequestSchema],
  invites: [inviteSchema],
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);
export default Team;
