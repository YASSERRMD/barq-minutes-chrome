import { z } from 'zod';

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
  speaker: z.string().optional(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const DecisionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  speaker: z.string().optional(),
  ts: z.number().nonnegative().optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const ActionItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  owner: z.string().nullable().optional(),
  due: z.string().nullable().optional(),
  ts: z.number().nonnegative().optional(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const OpenQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  speaker: z.string().optional(),
  ts: z.number().nonnegative().optional(),
});
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;

export const ProcessingStatusSchema = z.enum([
  'idle',
  'preparing-models',
  'transcribing',
  'extracting',
  'deduplicating',
  'summarizing',
  'indexing',
  'ready',
  'error',
]);
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;

export const MeetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  durationMs: z.number().nonnegative().default(0),
  source: z.enum(['record', 'upload']),
  status: ProcessingStatusSchema.default('idle'),
  storeAudio: z.boolean().default(false),
  segments: z.array(TranscriptSegmentSchema).default([]),
  summary: z.array(z.string()).default([]),
  decisions: z.array(DecisionSchema).default([]),
  actions: z.array(ActionItemSchema).default([]),
  questions: z.array(OpenQuestionSchema).default([]),
  errorMessage: z.string().optional(),
});
export type Meeting = z.infer<typeof MeetingSchema>;

export const ExtractionDecisionsResponseSchema = z.object({
  decisions: z.array(z.object({ text: z.string().min(1), speaker: z.string().optional() })),
});
export const ExtractionActionsResponseSchema = z.object({
  actions: z.array(
    z.object({
      text: z.string().min(1),
      owner: z.string().nullable().optional(),
      due: z.string().nullable().optional(),
    }),
  ),
});
export const ExtractionQuestionsResponseSchema = z.object({
  questions: z.array(z.object({ text: z.string().min(1), speaker: z.string().optional() })),
});
