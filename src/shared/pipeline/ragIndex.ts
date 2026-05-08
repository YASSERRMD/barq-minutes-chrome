import { embedBatch } from '../models/embedding';
import { clearMeetingChunks, indexChunks } from '../storage/vectors';
import { buildRagChunks } from './ragChunks';
import { updateMeeting } from '../storage/meetings';
import type { TranscriptSegment } from '../schemas/meeting';

export async function indexMeetingForRag(
  meetingId: string,
  segments: TranscriptSegment[],
): Promise<number> {
  await clearMeetingChunks(meetingId);
  if (segments.length === 0) return 0;

  const chunks = buildRagChunks(meetingId, segments);
  if (chunks.length === 0) return 0;

  const texts = chunks.map((c) => c.text);
  const embeddings = await embedBatch(texts);

  const records = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
  await indexChunks(records);

  await updateMeeting(meetingId, (m) => ({ ...m, status: 'ready' }));
  return records.length;
}
