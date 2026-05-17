import { decodeBlobToMono, TARGET_SAMPLE_RATE } from './audioBuffer';
import { transcribePcm } from './transcribe';
import type { Meeting, TranscriptSegment } from '../schemas/meeting';
import { updateMeeting } from '../storage/meetings';
import { saveAudio } from '../storage/audio';

export interface FinalizeOptions {
  meetingId: string;
  fullBlob: Blob;
  durationMs: number;
  storeAudio: boolean;
  alreadyTranscribed: TranscriptSegment[];
}

/**
 * Take the live-transcribed segments and only transcribe the remaining tail of
 * the recording that the live loop did not yet cover. Avoids the O(N) cost of
 * re-decoding the entire blob and prevents duplicate segments at the boundary.
 */
export async function finalizeRecording(opts: FinalizeOptions): Promise<Meeting> {
  const sorted = opts.alreadyTranscribed.slice().sort((a, b) => a.start - b.start);
  const lastEnd = sorted.length ? sorted[sorted.length - 1].end : 0;

  let combined: TranscriptSegment[] = sorted;

  // Allow a 500ms tolerance so we don't bother transcribing a sub-window of
  // audio that the live loop effectively already covered.
  const tailStartMs = Math.max(0, lastEnd);
  const tailLengthMs = Math.max(0, opts.durationMs - tailStartMs);

  if (tailLengthMs > 500) {
    const pcm = await decodeBlobToMono(opts.fullBlob);
    const fromSamples = Math.floor((tailStartMs / 1000) * TARGET_SAMPLE_RATE);
    const tailPcm = pcm.subarray(fromSamples);
    if (tailPcm.length > 0) {
      const tailSegments = await transcribePcm(tailPcm, tailStartMs);
      // De-duplicate by start: drop any tail segment whose start falls before
      // an existing segment's end (overlap).
      const cleanTail = tailSegments.filter((s) => s.start >= lastEnd);
      combined = combined.concat(cleanTail);
    }
  }

  combined.sort((a, b) => a.start - b.start);

  if (opts.storeAudio) {
    await saveAudio(opts.meetingId, opts.fullBlob, opts.durationMs);
  }

  return updateMeeting(opts.meetingId, (m) => ({
    ...m,
    durationMs: opts.durationMs,
    segments: combined,
    storeAudio: opts.storeAudio,
    status: 'extracting',
  }));
}
