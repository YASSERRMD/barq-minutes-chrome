import { decodeBlobToMono, TARGET_SAMPLE_RATE } from './audioBuffer';
import { transcribePcm } from './transcribe';
import type { TranscriptSegment } from '../schemas/meeting';

export const SUPPORTED_UPLOAD_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
];

export function isSupportedUploadType(file: File): boolean {
  if (file.type && SUPPORTED_UPLOAD_TYPES.includes(file.type)) return true;
  return /\.(mp3|m4a|ogg|wav|webm|flac)$/i.test(file.name);
}

export interface UploadDecodeResult {
  pcm: Float32Array;
  durationMs: number;
}

export async function decodeUpload(file: File): Promise<UploadDecodeResult> {
  if (!isSupportedUploadType(file)) {
    throw new Error(`Unsupported audio type: ${file.type || file.name}`);
  }
  const pcm = await decodeBlobToMono(file);
  const durationMs = Math.round((pcm.length / TARGET_SAMPLE_RATE) * 1000);
  return { pcm, durationMs };
}

export interface ChunkedTranscribeOptions {
  pcm: Float32Array;
  windowSec?: number;
  onProgress?: (progressed: number, total: number) => void;
  onSegment?: (seg: TranscriptSegment) => void;
}

export async function transcribeUploadChunks(
  options: ChunkedTranscribeOptions,
): Promise<TranscriptSegment[]> {
  const windowSec = options.windowSec ?? 30;
  const samplesPerWindow = TARGET_SAMPLE_RATE * windowSec;
  const total = options.pcm.length;
  const all: TranscriptSegment[] = [];
  let processed = 0;
  while (processed < total) {
    const end = Math.min(processed + samplesPerWindow, total);
    const slice = options.pcm.subarray(processed, end);
    const offsetMs = Math.round((processed / TARGET_SAMPLE_RATE) * 1000);
    const segments = await transcribePcm(slice, offsetMs);
    for (const s of segments) {
      all.push(s);
      options.onSegment?.(s);
    }
    processed = end;
    options.onProgress?.(processed, total);
  }
  return all;
}
