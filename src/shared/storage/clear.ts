import { openDb, STORE_AUDIO, STORE_MEETINGS, STORE_SETTINGS, STORE_VECTORS } from './db';

export async function clearAllData(options: { keepSettings?: boolean } = {}): Promise<void> {
  const db = await openDb();
  const stores = options.keepSettings
    ? [STORE_MEETINGS, STORE_AUDIO, STORE_VECTORS]
    : [STORE_MEETINGS, STORE_AUDIO, STORE_VECTORS, STORE_SETTINGS];

  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(stores, 'readwrite');
    for (const s of stores) {
      t.objectStore(s).clear();
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearMeetingData(meetingId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([STORE_MEETINGS, STORE_AUDIO, STORE_VECTORS], 'readwrite');
    t.objectStore(STORE_MEETINGS).delete(meetingId);
    t.objectStore(STORE_AUDIO).delete(meetingId);
    const vecStore = t.objectStore(STORE_VECTORS);
    const idx = vecStore.index('meetingId');
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
