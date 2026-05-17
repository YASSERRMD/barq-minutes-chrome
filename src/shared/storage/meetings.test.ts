import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createMeeting, getMeeting, listMeetings, updateMeeting, deleteMeeting } from './meetings';

async function resetDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('barq-minutes');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('meeting CRUD', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates and reads a meeting back', async () => {
    const m = await createMeeting({ source: 'record', title: 'Test' });
    const fetched = await getMeeting(m.id);
    expect(fetched?.title).toBe('Test');
    expect(fetched?.status).toBe('idle');
    expect(fetched?.segments).toEqual([]);
  });

  it('listMeetings sorts by updatedAt desc', async () => {
    const a = await createMeeting({ source: 'record', title: 'First' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createMeeting({ source: 'upload', title: 'Second' });
    const all = await listMeetings();
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);
  });

  it('updateMeeting bumps updatedAt and persists changes', async () => {
    const m = await createMeeting({ source: 'record', title: 'Original' });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await updateMeeting(m.id, (prev) => ({ ...prev, title: 'Edited' }));
    expect(updated.title).toBe('Edited');
    expect(updated.updatedAt).toBeGreaterThan(m.updatedAt);
  });

  it('deleteMeeting removes the row', async () => {
    const m = await createMeeting({ source: 'record', title: 'Doomed' });
    await deleteMeeting(m.id);
    expect(await getMeeting(m.id)).toBeUndefined();
  });
});
