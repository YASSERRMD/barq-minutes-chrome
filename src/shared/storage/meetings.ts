import { openDb, reqToPromise, STORE_MEETINGS } from './db';
import { MeetingSchema, type Meeting } from '../schemas/meeting';
import { ulid } from '../utils/ulid';

export async function createMeeting(
  partial: Partial<Meeting> & Pick<Meeting, 'source'>,
): Promise<Meeting> {
  const now = Date.now();
  const meeting = MeetingSchema.parse({
    id: partial.id ?? ulid(now),
    title: partial.title ?? 'Untitled meeting',
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
    durationMs: partial.durationMs ?? 0,
    source: partial.source,
    status: partial.status ?? 'idle',
    storeAudio: partial.storeAudio ?? false,
    segments: partial.segments ?? [],
    summary: partial.summary ?? [],
    decisions: partial.decisions ?? [],
    actions: partial.actions ?? [],
    questions: partial.questions ?? [],
  });
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_MEETINGS, 'readwrite');
    t.objectStore(STORE_MEETINGS).put(meeting);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return meeting;
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const db = await openDb();
  const t = db.transaction(STORE_MEETINGS, 'readonly');
  const value = await reqToPromise(t.objectStore(STORE_MEETINGS).get(id));
  if (!value) return undefined;
  return MeetingSchema.parse(value);
}

export async function listMeetings(): Promise<Meeting[]> {
  const db = await openDb();
  const t = db.transaction(STORE_MEETINGS, 'readonly');
  const all = (await reqToPromise(t.objectStore(STORE_MEETINGS).getAll())) as unknown[];
  return all
    .map((m) => MeetingSchema.safeParse(m))
    .filter((p): p is { success: true; data: Meeting } => p.success)
    .map((p) => p.data)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateMeeting(
  id: string,
  updater: (m: Meeting) => Meeting,
): Promise<Meeting> {
  const existing = await getMeeting(id);
  if (!existing) throw new Error(`Meeting ${id} not found`);
  const next = MeetingSchema.parse({ ...updater(existing), updatedAt: Date.now() });
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_MEETINGS, 'readwrite');
    t.objectStore(STORE_MEETINGS).put(next);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return next;
}

export async function deleteMeeting(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_MEETINGS, 'readwrite');
    t.objectStore(STORE_MEETINGS).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
