import { embedText } from '../models/embedding';
import { searchTopK, type TranscriptChunkRecord } from '../storage/vectors';

export interface RagSource extends TranscriptChunkRecord {
  score: number;
}

/**
 * Drop chunks below this cosine similarity. Without a floor the model gets
 * "evidence" with score 0.1 for unrelated content and happily invents answers.
 * Tuned conservatively; tightening this further would also be reasonable.
 */
export const MIN_RELEVANCE = 0.3;

export interface RetrieveOptions {
  k?: number;
  minRelevance?: number;
}

export async function retrieveContext(
  meetingId: string,
  question: string,
  options: RetrieveOptions | number = {},
): Promise<RagSource[]> {
  const opts = typeof options === 'number' ? { k: options } : options;
  const k = opts.k ?? 5;
  const floor = opts.minRelevance ?? MIN_RELEVANCE;
  const trimmed = question.trim();
  if (!trimmed) return [];
  const queryEmbedding = await embedText(trimmed);
  const ranked = await searchTopK(meetingId, queryEmbedding, k);
  return ranked.filter((r) => r.score >= floor);
}
