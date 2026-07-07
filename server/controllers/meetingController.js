import { getCache, setCache } from "../utils/cache.js";
import { meetingCacheKey, invalidateMeetingCache } from "../utils/meetingCache.js";
import Meeting from '../models/Meeting.js';
import { getIO } from '../socket/io.js';
import { uploadRecordingBuffer, broadcastRecordingStatus, notifyParticipantsRecordingReady } from '../services/recordingService.js';

// POST /api/meetings — create meeting
export const createMeeting = async (req, res) => {
  try {
    const { title, scheduledAt, aiEnabled } = req.body;

    const meeting = await Meeting.create({
      title,
      host: req.user._id,
      scheduledAt: scheduledAt || Date.now(),
      participants: [{ user: req.user._id, role: 'host' }],
      aiEnabled: aiEnabled !== undefined ? aiEnabled : true,
    });

    await meeting.populate('host', 'name email avatar');

    res.status(201).json({
      message: 'Meeting created',
      meeting,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/meetings — get all meetings for logged-in user
export const getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    })
      .populate('host', 'name avatar')
      .populate('participants.user', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ meetings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/meetings/:id — get single meeting
export const getMeeting = async (req, res) => {
  try {
    const cacheKey = meetingCacheKey(req.params.id);
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.status(200).json({
        meeting: cached,
        source: 'cache',
      });
    }

    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name avatar')
      .populate({ path: 'actionItems.taskId', populate: { path: 'assignee', select: 'name avatar' } });

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found',
      });
    }

    await setCache(cacheKey, meeting, 120);

    return res.status(200).json({
      meeting,
      source: 'db',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/meetings/join/:code — join by meeting code
export const getMeetingByCode = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      meetingCode: req.params.code.toUpperCase(),
    }).populate('host', 'name avatar');

    if (!meeting) {
      return res.status(404).json({
        message: 'Invalid meeting code',
      });
    }

    if (meeting.status === 'ended') {
      return res.status(400).json({
        message: 'Meeting has ended',
      });
    }

    res.status(200).json({ meeting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/meetings/:id/start
export const startMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the host can start the meeting',
      });
    }

    meeting.status = 'active';
    meeting.startedAt = Date.now();

    await meeting.save();

    await invalidateMeetingCache(meeting._id);

    res.status(200).json({
      message: 'Meeting started',
      meeting,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/meetings/:id/ai-settings
export const updateAiSettings = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the host can change AI settings',
      });
    }

    meeting.aiEnabled = !!req.body.aiEnabled;
    await meeting.save();

    await invalidateMeetingCache(meeting._id);

    res.status(200).json({
      message: 'AI settings updated',
      meeting,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/meetings/:id/end
export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the host can end the meeting',
      });
    }

    meeting.status = 'ended';
    meeting.endedAt = Date.now();

    await meeting.save();

    await invalidateMeetingCache(meeting._id);

    // Tell everyone still in the room the meeting is over so they get redirected too
    const io = getIO();
    if (io) io.to(meeting._id.toString()).emit('meeting-ended', { meetingId: meeting._id.toString() });

    res.status(200).json({
      message: 'Meeting ended',
      meeting,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const MAX_RECORDING_SIZE_MB = 150;

// POST /api/meetings/:id/recording — host uploads the local recording blob to Cloudinary
export const uploadRecording = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can upload the recording' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No recording file provided' });
    }

    const io = getIO();

    meeting.recordingStatus = 'processing';
    await meeting.save();
    await invalidateMeetingCache(meeting._id);
    broadcastRecordingStatus(io, meeting, 'processing');

    let uploadResult;
    try {
      uploadResult = await uploadRecordingBuffer(req.file.buffer);
    } catch (uploadErr) {
      console.error('Recording upload to Cloudinary failed:', uploadErr);
      meeting.recordingStatus = 'failed';
      await meeting.save();
      await invalidateMeetingCache(meeting._id);
      broadcastRecordingStatus(io, meeting, 'failed');
      return res.status(500).json({ message: 'Failed to upload recording' });
    }

    meeting.recordingUrl = uploadResult.secure_url;
    meeting.recordingStatus = 'ready';
    await meeting.save();
    await invalidateMeetingCache(meeting._id);
    broadcastRecordingStatus(io, meeting, 'ready', meeting.recordingUrl);

    await notifyParticipantsRecordingReady(io, meeting);

    res.status(200).json({
      message: 'Recording uploaded',
      recordingUrl: meeting.recordingUrl,
      recordingStatus: meeting.recordingStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/meetings/:id/actionItems/:itemId
export const toggleActionItem = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const item = meeting.actionItems.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Action item not found' });
    }

    item.done = !item.done;
    await meeting.save();
    await invalidateMeetingCache(meeting._id);

    res.status(200).json({ actionItems: meeting.actionItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/meetings/:id
export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the host can delete the meeting',
      });
    }

    await invalidateMeetingCache(meeting._id);

    await meeting.deleteOne();

    res.status(200).json({
      message: 'Meeting deleted',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
