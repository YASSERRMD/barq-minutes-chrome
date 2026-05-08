import { openDb, reqToPromise, STORE_AUDIO } from './db';

interface AudioRecord {
  meetingId: string;
  mimeType: string;
  blob: Blob;
  durationMs: number;
  storedAt: number;
}

export async function saveAudio(
  meetingId: string,
  blob: Blob,
  durationMs: number,
): Promise<void> {
  const rec: AudioRecord = {
    meetingId,
    mimeType: blob.type || 'audio/webm',
    blob,
    durationMs,
    storedAt: Date.now(),
  };
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
  return (await reqToPromise(t.objectStore(STORE_AUDIO).get(meetingId))) ?? undefined;
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

export async function totalAudioBytes(): Promise<number> {
  const db = await openDb();
  const t = db.transaction(STORE_AUDIO, 'readonly');
  const all = (await reqToPromise(t.objectStore(STORE_AUDIO).getAll())) as AudioRecord[];
  return all.reduce((sum, r) => sum + (r.blob?.size ?? 0), 0);
}
