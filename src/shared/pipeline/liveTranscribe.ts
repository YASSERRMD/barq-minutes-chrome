import { transcribePcm } from './transcribe';
import type { TranscriptSegment } from '../schemas/meeting';
import { TARGET_SAMPLE_RATE } from './audioBuffer';

export interface LiveTranscriberOptions {
  /** Window size in seconds. Whisper handles up to 30s natively. */
  windowSec?: number;
  /** Overlap between consecutive windows in seconds, to avoid clipping words. */
  overlapSec?: number;
  onSegment?: (segment: TranscriptSegment) => void;
  onError?: (err: Error) => void;
}

export interface LiveTranscriberHandle {
  /** Push a mono PCM frame from the recorder's AudioWorklet tap. */
  pushPcm: (frame: Float32Array) => void;
  /** Drain any remaining audio not yet transcribed. */
  flushFinal: () => Promise<void>;
  stop: () => void;
  /** Total samples seen so far. Useful for callers that need durationMs. */
  totalSamples: () => number;
}

/**
 * Live transcriber that consumes Float32 PCM frames. Maintains a growing
 * buffer (list of frames + total length), advances a `consumedSamples` cursor
 * after each successful transcription, and only emits segments whose start
 * falls past the previous window's end so overlap regions never produce
 * duplicate text.
 *
 * Crucially, this does NOT touch the MediaRecorder blob. The blob is kept for
 * storage / finalize-pass only. This fixes the previous implementation which
 * re-decoded the entire growing webm stream every window.
 */
export function startLiveTranscriber(options: LiveTranscriberOptions = {}): LiveTranscriberHandle {
  const windowSec = options.windowSec ?? 6;
  const overlapSec = Math.max(0, Math.min(options.overlapSec ?? 1, windowSec - 0.5));
  const windowSamples = Math.floor(windowSec * TARGET_SAMPLE_RATE);
  const advanceSamples = Math.floor((windowSec - overlapSec) * TARGET_SAMPLE_RATE);

  let frames: Float32Array[] = [];
  let totalSamples = 0;
  let consumedSamples = 0;
  // `lastEmittedEndMs` rejects segments whose start lies inside the overlap
  // region we already covered, regardless of Whisper chunk boundaries.
  let lastEmittedEndMs = 0;
  let busy = false;
  let stopped = false;

  function concatBuffer(fromSample: number, toSample: number): Float32Array {
    const out = new Float32Array(toSample - fromSample);
    let cursor = 0;
    let absolute = 0;
    for (const frame of frames) {
      const frameEnd = absolute + frame.length;
      if (frameEnd > fromSample && absolute < toSample) {
        const sliceFrom = Math.max(0, fromSample - absolute);
        const sliceTo = Math.min(frame.length, toSample - absolute);
        const slice = frame.subarray(sliceFrom, sliceTo);
        out.set(slice, cursor);
        cursor += slice.length;
      }
      absolute = frameEnd;
      if (absolute >= toSample) break;
    }
    return out;
  }

  function trimConsumedFrames(): void {
    // Drop frames entirely before `consumedSamples - overlapSamples` (we may
    // still need the overlap region for the next window).
    const keepFrom = Math.max(0, consumedSamples - windowSamples);
    let absolute = 0;
    const next: Float32Array[] = [];
    for (const frame of frames) {
      const frameEnd = absolute + frame.length;
      if (frameEnd > keepFrom) next.push(frame);
      absolute = frameEnd;
    }
    frames = next;
  }

  async function tryProcessWindow(force: boolean): Promise<void> {
    if (busy || stopped) return;
    const available = totalSamples - consumedSamples;
    const target = force ? Math.min(available, windowSamples) : windowSamples;
    if (!force && available < windowSamples) return;
    if (target <= 0) return;
    busy = true;
    try {
      const fromSample = consumedSamples;
      const toSample = fromSample + target;
      const pcm = concatBuffer(fromSample, toSample);
      const startOffsetMs = Math.round((fromSample / TARGET_SAMPLE_RATE) * 1000);
      const segments = await transcribePcm(pcm, startOffsetMs);
      for (const seg of segments) {
        if (seg.end <= lastEmittedEndMs) continue;
        if (seg.start < lastEmittedEndMs) seg.start = lastEmittedEndMs;
        options.onSegment?.(seg);
        lastEmittedEndMs = seg.end;
      }
      // Advance the cursor by `advanceSamples` so the next window overlaps by
      // `overlapSec`. On the final flush we consume the rest.
      consumedSamples = force
        ? toSample
        : Math.min(toSample, fromSample + advanceSamples);
      trimConsumedFrames();
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      busy = false;
      if (!stopped && totalSamples - consumedSamples >= windowSamples) {
        // More than a window has piled up while we were transcribing.
        void tryProcessWindow(false);
      }
    }
  }

  return {
    pushPcm(frame) {
      if (stopped) return;
      frames.push(frame);
      totalSamples += frame.length;
      if (totalSamples - consumedSamples >= windowSamples) {
        void tryProcessWindow(false);
      }
    },
    async flushFinal() {
      // Drain everything remaining; busy-wait briefly if a window is in flight.
      while (busy) await new Promise((r) => setTimeout(r, 50));
      while (totalSamples - consumedSamples > 0) {
        await tryProcessWindow(true);
        while (busy) await new Promise((r) => setTimeout(r, 50));
      }
    },
    stop() {
      stopped = true;
      frames = [];
      totalSamples = 0;
    },
    totalSamples: () => totalSamples,
  };
}
