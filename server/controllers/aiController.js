import Meeting from '../models/Meeting.js';
import { invalidateMeetingCache } from '../utils/meetingCache.js';
import { transcribeAudioChunk, summarizeTranscript } from '../services/openaiService.js';

// POST /api/ai/transcribe/:meetingId
export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const meetingDoc = await Meeting.findById(req.params.meetingId).select('aiEnabled');
    if (!meetingDoc) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    if (meetingDoc.aiEnabled === false) {
      return res.status(403).json({ message: 'AI features are disabled for this meeting' });
    }

    const text = await transcribeAudioChunk(req.file.buffer, req.file.mimetype);

    if (text) {
      // chunks can land out of order / overlap — plain findById->save would drop whichever
      // one saves first, so append atomically instead
      await Meeting.findByIdAndUpdate(
        req.params.meetingId,
        [
          {
            $set: {
              transcript: {
                $concat: [
                  { $ifNull: ['$transcript', ''] },
                  { $cond: [{ $eq: [{ $ifNull: ['$transcript', ''] }, ''] }, '', ' '] },
                  text,
                ],
              },
            },
          },
        ],
        { updatePipeline: true }
      );
      // getMeeting caches for 2min, invalidate or an already-open page won't see this chunk
      await invalidateMeetingCache(req.params.meetingId);
    }

    res.status(200).json({ transcript: text || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/ai/summarize/:meetingId
export const summarizeMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.aiEnabled === false) {
      return res.status(403).json({ message: 'AI features are disabled for this meeting' });
    }

    // already summarized (page revisited) — re-running would wipe actionItems and any
    // taskId/done state already attached to them
    if (meeting.summary) {
      return res.status(200).json({ summary: meeting.summary, actionItems: meeting.actionItems });
    }

    if (!meeting.transcript) {
      return res.status(400).json({ message: 'No transcript available for this meeting' });
    }

    const parsed = await summarizeTranscript(meeting.transcript);

    // everyone's browser hits this at once when a meeting ends for all — plain save() would
    // race (VersionError on the loser), so only let the first write actually land
    const updated = await Meeting.findOneAndUpdate(
      { _id: req.params.meetingId, summary: { $in: [null, ''] } },
      { $set: { summary: parsed.summary, actionItems: parsed.actionItems || [] } },
      { new: true }
    );

    const result = updated || (await Meeting.findById(req.params.meetingId));
    await invalidateMeetingCache(req.params.meetingId);

    res.status(200).json({ summary: result.summary, actionItems: result.actionItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
