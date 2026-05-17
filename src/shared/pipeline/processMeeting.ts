import { chunkTranscriptForExtraction } from './chunker';
import { extractAllForWindow } from './extractCombined';
import { dedupeActions, dedupeDecisions, dedupeQuestions } from './dedupe';
import { summarizeMeeting } from './summary';
import { getMeeting, updateMeeting } from '../storage/meetings';
import type { ActionItem, Decision, Meeting, OpenQuestion, ProcessingStatus } from '../schemas/meeting';

export interface ProcessProgress {
  status: ProcessingStatus;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

export interface ProcessOptions {
  meetingId: string;
  onProgress?: (p: ProcessProgress) => void;
}

export async function processMeeting(options: ProcessOptions): Promise<Meeting> {
  const meeting = await getMeeting(options.meetingId);
  if (!meeting) throw new Error(`Meeting ${options.meetingId} not found`);

  options.onProgress?.({ status: 'extracting', message: 'Chunking transcript' });
  const windows = chunkTranscriptForExtraction(meeting.segments);

  await updateMeeting(meeting.id, (m) => ({ ...m, status: 'extracting' }));

  const allDecisions: Decision[] = [];
  const allActions: ActionItem[] = [];
  const allQuestions: OpenQuestion[] = [];

  for (let i = 0; i < windows.length; i++) {
    options.onProgress?.({
      status: 'extracting',
      currentStep: i + 1,
      totalSteps: windows.length,
      message: `Extracting window ${i + 1} of ${windows.length}`,
    });
    const w = windows[i];
    const { decisions, actions, questions } = await extractAllForWindow(w);
    allDecisions.push(...decisions);
    allActions.push(...actions);
    allQuestions.push(...questions);
  }

  options.onProgress?.({ status: 'deduplicating', message: 'Deduplicating items' });
  await updateMeeting(meeting.id, (m) => ({ ...m, status: 'deduplicating' }));
  const [dedupedDecisions, dedupedActions, dedupedQuestions] = await Promise.all([
    dedupeDecisions(allDecisions),
    dedupeActions(allActions),
    dedupeQuestions(allQuestions),
  ]);

  options.onProgress?.({ status: 'summarizing', message: 'Generating summary' });
  await updateMeeting(meeting.id, (m) => ({ ...m, status: 'summarizing' }));
  const summary = await summarizeMeeting(windows);

  return updateMeeting(meeting.id, (m) => ({
    ...m,
    decisions: dedupedDecisions,
    actions: dedupedActions,
    questions: dedupedQuestions,
    summary,
    status: 'indexing',
  }));
}
