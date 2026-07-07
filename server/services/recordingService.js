import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import Notification from '../models/Notification.js';

export const uploadRecordingBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder: 'intellmeet/recordings' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(uploadStream);
  });

export const broadcastRecordingStatus = (io, meeting, recordingStatus, recordingUrl) => {
  if (!io) return;
  io.to(`meeting-summary:${meeting._id}`).emit('recording-status-changed', {
    meetingId: meeting._id.toString(),
    recordingStatus,
    recordingUrl,
  });
};

export const notifyParticipantsRecordingReady = async (io, meeting) => {
  const notifications = await Notification.insertMany(
    meeting.participants.map((p) => ({
      recipient: p.user,
      type: 'recording_ready',
      message: `Recording is now available for "${meeting.title}"`,
      meetingId: meeting._id,
    }))
  );
  if (io) {
    notifications.forEach((n) => {
      io.emit('notification', { ...n.toObject(), toUserId: n.recipient.toString() });
    });
  }
};
