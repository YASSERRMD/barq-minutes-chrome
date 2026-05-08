import { runJson } from './jsonRunner';
import { ExtractionQuestionsResponseSchema } from '../schemas/meeting';
import type { OpenQuestion } from '../schemas/meeting';
import type { TranscriptWindow } from './chunker';
import { ulid } from '../utils/ulid';

const SYS = `You extract open questions from a meeting transcript window.
An open question is a question raised during the meeting that was not answered or resolved.
Return strict JSON with one key "questions" whose value is an array of objects.
Each object must have a "text" field describing the unresolved question, optional "speaker".
Do not include rhetorical questions or questions that were answered.
If no open questions exist, return {"questions": []}.`;

function buildPrompt(window: TranscriptWindow, strict = false): string {
  return `${SYS}${strict ? '\nRespond with ONLY valid JSON. No prose. No markdown.' : ''}

Transcript window:
"""
${window.text}
"""

JSON:`;
}

export async function extractQuestions(window: TranscriptWindow): Promise<OpenQuestion[]> {
  const result = await runJson(
    {
      prompt: buildPrompt(window, false),
      retryPrompt: buildPrompt(window, true),
      maxNewTokens: 256,
      temperature: 0.1,
    },
    ExtractionQuestionsResponseSchema,
  );
  if (!result) return [];
  return result.questions.map((q) => ({
    id: ulid(),
    text: q.text.trim(),
    speaker: q.speaker?.trim() || undefined,
    ts: window.fromMs,
  }));
}
