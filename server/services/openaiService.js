import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const transcribeAudioChunk = async (buffer, mimetype) => {
  const audioFile = await toFile(buffer, 'chunk.webm', { type: mimetype });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    // pin the language or Whisper free-guesses per chunk and can mistranslate quiet/short
    // audio into a random language (saw stray Arabic/Ukrainian text on real test runs)
    language: 'en',
  });

  return transcription.text?.trim() || '';
};

export const summarizeTranscript = async (transcript) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          "You are a meeting intelligence assistant. Given a meeting transcript, produce: 1) A concise summary (3-5 sentences), 2) A JSON array of action items with shape [{text: string, assignee: string}] where assignee is a name mentioned near the action or 'Unassigned'. Respond ONLY with valid JSON: {summary: string, actionItems: [{text, assignee}]}",
      },
      { role: 'user', content: transcript },
    ],
  });

  return JSON.parse(completion.choices[0].message.content);
};
