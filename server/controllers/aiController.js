import OpenAI, { toFile } from 'openai';
import Meeting from '../models/Meeting.js';
import { deleteCache } from '../utils/cache.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai/transcribe/:meetingId
export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const meetingExists = await Meeting.exists({ _id: req.params.meetingId });
    if (!meetingExists) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const audioFile = await toFile(req.file.buffer, 'chunk.webm', { type: req.file.mimetype });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // pin the language or Whisper free-guesses per chunk and can mistranslate quiet/short
      // audio into a random language (saw stray Arabic/Ukrainian text on real test runs)
      language: 'en',
    });

    const text = transcription.text?.trim();

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
      await deleteCache(`meeting:${req.params.meetingId}`);
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

    // already summarized (page revisited) — re-running would wipe actionItems and any
    // taskId/done state already attached to them
    if (meeting.summary) {
      return res.status(200).json({ summary: meeting.summary, actionItems: meeting.actionItems });
    }

    if (!meeting.transcript) {
      return res.status(400).json({ message: 'No transcript available for this meeting' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            "You are a meeting intelligence assistant. Given a meeting transcript, produce: 1) A concise summary (3-5 sentences), 2) A JSON array of action items with shape [{text: string, assignee: string}] where assignee is a name mentioned near the action or 'Unassigned'. Respond ONLY with valid JSON: {summary: string, actionItems: [{text, assignee}]}",
        },
        { role: 'user', content: meeting.transcript },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    // everyone's browser hits this at once when a meeting ends for all — plain save() would
    // race (VersionError on the loser), so only let the first write actually land
    const updated = await Meeting.findOneAndUpdate(
      { _id: req.params.meetingId, summary: { $in: [null, ''] } },
      { $set: { summary: parsed.summary, actionItems: parsed.actionItems || [] } },
      { new: true }
    );

    const result = updated || (await Meeting.findById(req.params.meetingId));
    await deleteCache(`meeting:${req.params.meetingId}`);

    res.status(200).json({ summary: result.summary, actionItems: result.actionItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
