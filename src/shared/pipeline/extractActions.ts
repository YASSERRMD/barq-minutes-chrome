import { runJson } from './jsonRunner';
import { ExtractionActionsResponseSchema } from '../schemas/meeting';
import type { ActionItem } from '../schemas/meeting';
import type { TranscriptWindow } from './chunker';
import { ulid } from '../utils/ulid';

const SYS = `You extract action items from a meeting transcript window.
Return strict JSON with one key "actions" whose value is an array of objects.
Each action must have a "text" field describing the work to be done.
Optionally include "owner" (a name) and "due" (a date or relative date string).
Do not include decisions or open questions.
If no action items exist, return {"actions": []}.`;

function buildPrompt(window: TranscriptWindow, strict = false): string {
  return `${SYS}${strict ? '\nRespond with ONLY valid JSON. No prose. No markdown.' : ''}

Transcript window:
"""
${window.text}
"""

JSON:`;
}

export async function extractActions(window: TranscriptWindow): Promise<ActionItem[]> {
  const result = await runJson(
    {
      prompt: buildPrompt(window, false),
      retryPrompt: buildPrompt(window, true),
      maxNewTokens: 256,
      temperature: 0.1,
    },
    ExtractionActionsResponseSchema,
  );
  if (!result) return [];
  return result.actions.map((a) => ({
    id: ulid(),
    text: a.text.trim(),
    owner: a.owner?.toString().trim() ?? null,
    due: a.due?.toString().trim() ?? null,
    ts: window.fromMs,
  }));
}
