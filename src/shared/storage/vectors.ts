import { openDb, reqToPromise, STORE_VECTORS } from './db';
import { cosineSimilarity } from '../models/embedding';

export interface TranscriptChunkRecord {
  id: string;
  meetingId: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  embedding: Float32Array;
}

interface StoredRecord {
  id: string;
  meetingId: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  embedding: ArrayBuffer;
  dim: number;
}

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
  const all = (await reqToPromise(idx.getAll(meetingId))) as StoredRecord[];
  return all.map(fromStored);
}

export async function searchTopK(
  meetingId: string,
  queryEmbedding: Float32Array,
  k = 5,
): Promise<Array<TranscriptChunkRecord & { score: number }>> {
  const chunks = await listMeetingChunks(meetingId);
  const scored = chunks.map((c) => ({ ...c, score: cosineSimilarity(c.embedding, queryEmbedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
