import { loadWhisper, disposeWhisper } from './whisper';
import { loadLLM, disposeLLM } from './llm';
import { loadEmbedder, disposeEmbedder } from './embedding';
import type { ModelLoadProgress } from './cache';

export type SessionKind = 'asr' | 'llm' | 'embedding';

const subscribers = new Set<(p: ModelLoadProgress) => void>();

function broadcast(p: ModelLoadProgress) {
  for (const fn of subscribers) {
    try {
      fn(p);
    } catch {
      // ignore subscriber errors
    }
  }
}

export function onModelProgress(fn: (p: ModelLoadProgress) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export async function ensureSession(kind: SessionKind): Promise<unknown> {
  switch (kind) {
    case 'asr':
      return loadWhisper(broadcast);
    case 'llm':
      return loadLLM(broadcast);
    case 'embedding':
      return loadEmbedder(broadcast);
  }
}

export async function ensureSessions(kinds: SessionKind[]): Promise<void> {
  for (const k of kinds) {
    await ensureSession(k);
  }
}

export function disposeAllSessions(): void {
  disposeWhisper();
  disposeLLM();
  disposeEmbedder();
}
