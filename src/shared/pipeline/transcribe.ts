import { loadWhisper } from '../models/whisper';
import { decodeBlobToMono, sliceMono, TARGET_SAMPLE_RATE } from './audioBuffer';
import type { TranscriptSegment } from '../schemas/meeting';
import { ulid } from '../utils/ulid';

interface AsrOutput {
  text?: string;
  chunks?: Array<{
    text: string;
    timestamp?: [number, number] | [number, null];
  }>;
}

export interface TranscribeOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
  returnTimestamps?: boolean;
}

export async function transcribePcm(
  pcm: Float32Array,
  startOffsetMs: number,
  options: TranscribeOptions = {},
): Promise<TranscriptSegment[]> {
  if (pcm.length === 0) return [];
  const pipe = (await loadWhisper()) as (
    audio: Float32Array,
    opts: Record<string, unknown>,
  ) => Promise<AsrOutput | AsrOutput[]>;

  const out = await pipe(pcm, {
    language: options.language ?? 'english',
    task: options.task ?? 'transcribe',
    return_timestamps: options.returnTimestamps ?? true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const single = Array.isArray(out) ? out[0] : out;
  const segments: TranscriptSegment[] = [];
  if (single?.chunks?.length) {
    for (const c of single.chunks) {
      const ts = c.timestamp;
      const startSec = ts && ts[0] != null ? ts[0] : 0;
      const endSec = ts && ts[1] != null ? ts[1] : startSec;
      segments.push({
        id: ulid(),
        start: startOffsetMs + Math.round(startSec * 1000),
        end: startOffsetMs + Math.round(endSec * 1000),
        text: c.text.trim(),
      });
    }
  } else if (single?.text) {
    segments.push({
      id: ulid(),
      start: startOffsetMs,
      end: startOffsetMs + Math.round((pcm.length / TARGET_SAMPLE_RATE) * 1000),
      text: single.text.trim(),
    });
  }
  return segments.filter((s) => s.text.length > 0);
}

export async function transcribeBlobWindow(
  blob: Blob,
  fromMs: number,
  toMs: number,
  options: TranscribeOptions = {},
): Promise<TranscriptSegment[]> {
  const pcm = await decodeBlobToMono(blob);
  const window = sliceMono(pcm, fromMs, toMs);
  return transcribePcm(window, fromMs, options);
}

export async function transcribeBlob(
  blob: Blob,
  options: TranscribeOptions = {},
): Promise<TranscriptSegment[]> {
  const pcm = await decodeBlobToMono(blob);
  return transcribePcm(pcm, 0, options);
}
