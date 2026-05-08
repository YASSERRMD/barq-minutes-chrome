import { transcribeBlobWindow } from './transcribe';
import type { TranscriptSegment } from '../schemas/meeting';

export interface LiveTranscriberOptions {
  windowMs?: number;
  onSegment?: (segment: TranscriptSegment) => void;
  onError?: (err: Error) => void;
}

export interface LiveTranscriberHandle {
  pushChunk: (chunk: Blob) => void;
  flushFinal: (totalMs: number) => Promise<TranscriptSegment[]>;
  stop: () => void;
}

export function startLiveTranscriber(options: LiveTranscriberOptions = {}): LiveTranscriberHandle {
  const windowMs = options.windowMs ?? 8000;
  const buffered: Blob[] = [];
  let processing = false;
  let cursorMs = 0;
  let stopped = false;

  const processWindow = async (toMs?: number) => {
    if (processing || stopped) return;
    if (buffered.length === 0) return;
    processing = true;
    try {
      const blob = new Blob(buffered.slice(), { type: buffered[0].type || 'audio/webm' });
      const targetMs = toMs ?? cursorMs + windowMs;
      const segments = await transcribeBlobWindow(blob, cursorMs, targetMs);
      cursorMs = targetMs;
      for (const seg of segments) options.onSegment?.(seg);
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      processing = false;
    }
  };

  let interval: ReturnType<typeof setInterval> | null = null;
  interval = setInterval(() => {
    void processWindow();
  }, windowMs);

  return {
    pushChunk(chunk: Blob) {
      buffered.push(chunk);
    },
    async flushFinal(totalMs: number) {
      if (interval) clearInterval(interval);
      interval = null;
      while (processing) await new Promise((r) => setTimeout(r, 100));
      if (cursorMs < totalMs) {
        await processWindow(totalMs);
      }
      return [];
    },
    stop() {
      stopped = true;
      if (interval) clearInterval(interval);
      interval = null;
    },
  };
}
