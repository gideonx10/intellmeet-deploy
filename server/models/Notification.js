import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'task_assigned', 'mentioned', 'meeting_summary_ready', 'profile_incomplete', 'recording_ready',
      'team_join_request', 'team_join_accepted', 'team_join_rejected',
      'team_invite', 'team_invite_accepted', 'team_invite_rejected',
      'team_promoted',
    ],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
