import { z } from 'zod';
import { openDb, reqToPromise, STORE_AUDIO } from './db';

const AudioRecordSchema = z.object({
  meetingId: z.string(),
  mimeType: z.string(),
  blob: z.instanceof(Blob),
  durationMs: z.number().nonnegative(),
  storedAt: z.number().nonnegative(),
});
export type AudioRecord = z.infer<typeof AudioRecordSchema>;

export async function saveAudio(
  meetingId: string,
  blob: Blob,
  durationMs: number,
): Promise<void> {
  const rec = AudioRecordSchema.parse({
    meetingId,
    mimeType: blob.type || 'audio/webm',
    blob,
    durationMs,
    storedAt: Date.now(),
  });
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_AUDIO, 'readwrite');
    t.objectStore(STORE_AUDIO).put(rec);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getAudio(meetingId: string): Promise<AudioRecord | undefined> {
  const db = await openDb();
  const t = db.transaction(STORE_AUDIO, 'readonly');
  const raw = (await reqToPromise(t.objectStore(STORE_AUDIO).get(meetingId))) ?? undefined;
  if (!raw) return undefined;
  const parsed = AudioRecordSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return parsed.data;
}

export async function deleteAudio(meetingId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_AUDIO, 'readwrite');
    t.objectStore(STORE_AUDIO).delete(meetingId);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/**
 * Stream the audio store with a cursor and sum blob sizes without materialising
 * every blob into memory at once. A user with several long meetings can have
 * tens of gigabytes of audio total; the previous getAll() implementation read
 * them all into memory just to add up bytes.
 */
export async function totalAudioBytes(): Promise<number> {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const t = db.transaction(STORE_AUDIO, 'readonly');
    const req = t.objectStore(STORE_AUDIO).openCursor();
    let total = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(total);
        return;
      }
      const value = cursor.value as { blob?: Blob } | null;
      if (value?.blob instanceof Blob) total += value.blob.size;
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
    t.onerror = () => reject(t.error);
  });
}
