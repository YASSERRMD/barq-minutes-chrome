import { get, set, del } from 'idb-keyval';
import { MODEL_CACHE_NAMESPACE, MODEL_CACHE_VERSION, type ModelKind } from './config';

interface CacheRecord {
  modelId: string;
  kind: ModelKind;
  cachedAt: number;
  bytes: number;
  version: number;
}

function cacheKey(modelId: string): string {
  return `${MODEL_CACHE_NAMESPACE}:v${MODEL_CACHE_VERSION}:${modelId}`;
}

export async function getCacheRecord(modelId: string): Promise<CacheRecord | undefined> {
  return (await get<CacheRecord>(cacheKey(modelId))) ?? undefined;
}

export async function markCached(modelId: string, kind: ModelKind, bytes = 0): Promise<void> {
  const rec: CacheRecord = {
    modelId,
    kind,
    cachedAt: Date.now(),
    bytes,
    version: MODEL_CACHE_VERSION,
  };
  await set(cacheKey(modelId), rec);
}

export async function isCached(modelId: string): Promise<boolean> {
  return (await getCacheRecord(modelId)) !== undefined;
}

export async function clearCacheRecord(modelId: string): Promise<void> {
  await del(cacheKey(modelId));
}

export interface ModelLoadProgress {
  modelId: string;
  status: 'idle' | 'downloading' | 'loading-from-cache' | 'ready' | 'error';
  loaded?: number;
  total?: number;
  message?: string;
}
