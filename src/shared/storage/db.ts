const DB_NAME = 'barq-minutes';
const DB_VERSION = 1;

export const STORE_MEETINGS = 'meetings';
export const STORE_AUDIO = 'audio';
export const STORE_SETTINGS = 'settings';
export const STORE_VECTORS = 'vectors';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MEETINGS)) {
        const store = db.createObjectStore(STORE_MEETINGS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'meetingId' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_VECTORS)) {
        const store = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
        store.createIndex('meetingId', 'meetingId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// NOTE: A generic `tx` helper that accepted `(tx) => Promise<T>` was removed.
// IndexedDB transactions auto-commit at the next microtask without a pending
// request, so a generic helper that allowed callers to await arbitrary work
// inside the transaction would silently commit early and resolve with a stale
// result. Each store opens its own scoped transaction with synchronous request
// chains. If you need a helper, make it accept a synchronous request-issuing
// callback only.

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
