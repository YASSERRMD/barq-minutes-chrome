import { runJson } from './jsonRunner';
import { ExtractionDecisionsResponseSchema } from '../schemas/meeting';
import type { Decision } from '../schemas/meeting';
import type { TranscriptWindow } from './chunker';
import { ulid } from '../utils/ulid';

const SYS = `You extract decisions made during a meeting from a transcript window.
Return strict JSON with one key "decisions" whose value is an array of objects.
Each object must have a "text" field describing the decision in plain English, and an optional "speaker".
Only include decisions that were actually made. Do not include open questions or action items.
If no decisions were made, return {"decisions": []}.`;

function buildPrompt(window: TranscriptWindow, strict = false): string {
  return `${SYS}${strict ? '\nRespond with ONLY valid JSON. No prose. No markdown.' : ''}

Transcript window:
"""
${window.text}
"""

JSON:`;
}

export async function extractDecisions(window: TranscriptWindow): Promise<Decision[]> {
  const result = await runJson(
    {
      prompt: buildPrompt(window, false),
      retryPrompt: buildPrompt(window, true),
      maxNewTokens: 256,
      temperature: 0.1,
    },
    ExtractionDecisionsResponseSchema,
  );
  if (!result) return [];
  return result.decisions.map((d) => ({
    id: ulid(),
    text: d.text,
    speaker: d.speaker,
    ts: window.fromMs,
  }));
}
