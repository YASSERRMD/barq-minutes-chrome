import { z } from 'zod';
import { runJson } from './jsonRunner';
import type { ActionItem, Decision, OpenQuestion } from '../schemas/meeting';
import type { TranscriptWindow } from './chunker';
import { ulid } from '../utils/ulid';

const trimmedRequired = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: 'must be non-empty after trim' });

const trimmedOptionalNullable = z
  .union([z.string(), z.null()])
  .transform((s) => (s == null ? null : s.trim()))
  .transform((s) => (s && s.length > 0 ? s : null))
  .optional()
  .nullable();

const CombinedSchema = z.object({
  decisions: z
    .array(z.object({ text: trimmedRequired, speaker: trimmedRequired.optional() }))
    .default([]),
  actions: z
    .array(
      z.object({
        text: trimmedRequired,
        owner: trimmedOptionalNullable,
        due: trimmedOptionalNullable,
      }),
    )
    .default([]),
  questions: z
    .array(z.object({ text: trimmedRequired, speaker: trimmedRequired.optional() }))
    .default([]),
});

const SYS = `You read a single window of a meeting transcript and extract three lists.
Return STRICT JSON with these keys: "decisions", "actions", "questions".

A "decision" is a choice that was actually made during this window. Each decision has a "text" (string) and optionally "speaker" (string).
An "action" is something a person committed to do. Each action has a "text", optional "owner" (a name) and optional "due" (a date or relative date string).
A "question" is an unresolved question raised during the window. Each question has a "text" and optionally "speaker".

If a category has no items, return an empty array for that key.
Do not invent items, do not infer speakers if not stated, do not include rhetorical questions or questions that were answered.`;

function buildPrompt(window: TranscriptWindow, strict = false): string {
  return `${SYS}${strict ? '\nRespond with ONLY valid JSON. No prose. No markdown.' : ''}

Transcript window:
"""
${window.text}
"""

JSON:`;
}

export interface ExtractedItems {
  decisions: Decision[];
  actions: ActionItem[];
  questions: OpenQuestion[];
}

/**
 * Combined extractor. The previous implementation ran three sequential LLM
 * calls per window. The GLM5.1 distill session is a single in-flight pipeline,
 * so those three calls serialised internally anyway. Folding them into one
 * call eliminates two-thirds of the per-window prompt overhead and produces
 * decisions/actions/questions consistent with each other at the same window
 * boundary.
 */
export async function extractAllForWindow(window: TranscriptWindow): Promise<ExtractedItems> {
  const result = await runJson(
    {
      prompt: buildPrompt(window, false),
      retryPrompt: buildPrompt(window, true),
      maxNewTokens: 512,
      temperature: 0.1,
    },
    CombinedSchema,
  );
  if (!result) {
    return { decisions: [], actions: [], questions: [] };
  }
  return {
    decisions: result.decisions.map((d) => ({
      id: ulid(),
      text: d.text,
      speaker: d.speaker,
      ts: window.fromMs,
    })),
    actions: result.actions.map((a) => ({
      id: ulid(),
      text: a.text,
      owner: a.owner ?? null,
      due: a.due ?? null,
      ts: window.fromMs,
    })),
    questions: result.questions.map((q) => ({
      id: ulid(),
      text: q.text,
      speaker: q.speaker,
      ts: window.fromMs,
    })),
  };
}
