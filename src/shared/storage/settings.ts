import { openDb, reqToPromise, STORE_SETTINGS } from './db';
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from '../schemas/settings';

const SETTINGS_KEY = 'app-settings';

export async function getSettings(): Promise<Settings> {
  const db = await openDb();
  const t = db.transaction(STORE_SETTINGS, 'readonly');
  const rec = (await reqToPromise(t.objectStore(STORE_SETTINGS).get(SETTINGS_KEY))) as
    | { key: string; value: unknown }
    | undefined;
  if (!rec) return DEFAULT_SETTINGS;
  const parsed = SettingsSchema.safeParse(rec.value);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(value: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = SettingsSchema.parse({ ...current, ...value });
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_SETTINGS, 'readwrite');
    t.objectStore(STORE_SETTINGS).put({ key: SETTINGS_KEY, value: merged });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return merged;
}
