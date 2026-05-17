import { processMeeting } from './processMeeting';
import { indexMeetingForRag } from './ragIndex';
import { getMeeting, updateMeeting } from '../storage/meetings';
import { ensureSessions } from '../models/sessions';
import type { ProcessingStatus } from '../schemas/meeting';

export interface RunProcessingOptions {
  meetingId: string;
  onStatus?: (s: ProcessingStatus) => void;
}

/**
 * Run extraction, dedupe, summary, and RAG indexing for a meeting. On any
 * failure, persist `status: 'error'` and the error message on the meeting row
 * so the UI can offer a Retry button instead of leaving the meeting in an
 * intermediate state forever.
 */
export async function runProcessing(options: RunProcessingOptions): Promise<void> {
  const { meetingId, onStatus } = options;
  try {
    await ensureSessions(['llm', 'embedding']);
    onStatus?.('extracting');
    await processMeeting({
      meetingId,
      onProgress: (p) => onStatus?.(p.status),
    });
    const meeting = await getMeeting(meetingId);
    if (!meeting) return;
    onStatus?.('indexing');
    await indexMeetingForRag(meetingId, meeting.segments);
    onStatus?.('ready');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMeeting(meetingId, (m) => ({
      ...m,
      status: 'error',
      errorMessage: message,
    }));
    onStatus?.('error');
    throw err;
  }
}
