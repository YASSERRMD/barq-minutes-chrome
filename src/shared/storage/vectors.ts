import { z } from 'zod';
import { openDb, reqToPromise, STORE_VECTORS } from './db';
// Stored vectors are L2-normalised at embed time (transformers.js normalize=true)
// so a plain dot product is equivalent to cosine similarity and skips two sqrts.
import { dotProductNormalized } from '../models/embedding';

const StoredRecordSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  speaker: z.string().optional(),
  embedding: z.instanceof(ArrayBuffer),
  dim: z.number().int().positive(),
});

export interface TranscriptChunkRecord {
  id: string;
  meetingId: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  embedding: Float32Array;
}

type StoredRecord = z.infer<typeof StoredRecordSchema>;

function toStored(rec: TranscriptChunkRecord): StoredRecord {
  return {
    id: rec.id,
    meetingId: rec.meetingId,
    text: rec.text,
    start: rec.start,
    end: rec.end,
    speaker: rec.speaker,
    embedding: rec.embedding.buffer.slice(
      rec.embedding.byteOffset,
      rec.embedding.byteOffset + rec.embedding.byteLength,
    ) as ArrayBuffer,
    dim: rec.embedding.length,
  };
}

function fromStored(rec: StoredRecord): TranscriptChunkRecord {
  return {
    id: rec.id,
    meetingId: rec.meetingId,
    text: rec.text,
    start: rec.start,
    end: rec.end,
    speaker: rec.speaker,
    embedding: new Float32Array(rec.embedding),
  };
}

export async function indexChunks(chunks: TranscriptChunkRecord[]): Promise<void> {
  if (chunks.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_VECTORS, 'readwrite');
    const store = t.objectStore(STORE_VECTORS);
    for (const c of chunks) {
      store.put(toStored(c));
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearMeetingChunks(meetingId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_VECTORS, 'readwrite');
    const store = t.objectStore(STORE_VECTORS);
    const idx = store.index('meetingId');
    const req = idx.openCursor(IDBKeyRange.only(meetingId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function listMeetingChunks(meetingId: string): Promise<TranscriptChunkRecord[]> {
  const db = await openDb();
  const t = db.transaction(STORE_VECTORS, 'readonly');
  const idx = t.objectStore(STORE_VECTORS).index('meetingId');
  const raw = (await reqToPromise(idx.getAll(meetingId))) as unknown[];
  const validated: TranscriptChunkRecord[] = [];
  for (const item of raw) {
    const parsed = StoredRecordSchema.safeParse(item);
    if (parsed.success) validated.push(fromStored(parsed.data));
  }
  return validated;
}

export async function searchTopK(
  meetingId: string,
  queryEmbedding: Float32Array,
  k = 5,
): Promise<Array<TranscriptChunkRecord & { score: number }>> {
  const chunks = await listMeetingChunks(meetingId);
  const scored = chunks.map((c) => ({
    ...c,
    score: dotProductNormalized(c.embedding, queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
