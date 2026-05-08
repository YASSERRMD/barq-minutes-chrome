import { embedText } from '../models/embedding';
import { searchTopK, type TranscriptChunkRecord } from '../storage/vectors';

export interface RagSource extends TranscriptChunkRecord {
  score: number;
}

export async function retrieveContext(
  meetingId: string,
  question: string,
  k = 5,
): Promise<RagSource[]> {
  const trimmed = question.trim();
  if (!trimmed) return [];
  const queryEmbedding = await embedText(trimmed);
  return searchTopK(meetingId, queryEmbedding, k);
}
