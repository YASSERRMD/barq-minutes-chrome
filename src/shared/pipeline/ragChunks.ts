import type { TranscriptSegment } from '../schemas/meeting';
import { chunkTranscriptForRag } from './chunker';
import type { TranscriptChunkRecord } from '../storage/vectors';
import { ulid } from '../utils/ulid';

export function buildRagChunks(
  meetingId: string,
  segments: TranscriptSegment[],
): Array<Omit<TranscriptChunkRecord, 'embedding'>> {
  const windows = chunkTranscriptForRag(segments);
  return windows.map((w) => ({
    id: ulid(),
    meetingId,
    text: w.text,
    start: w.fromMs,
    end: w.toMs,
  }));
}
