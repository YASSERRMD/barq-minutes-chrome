import { transcribeBlob } from './transcribe';
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

export async function finalizeRecording(opts: FinalizeOptions): Promise<Meeting> {
  let combined: TranscriptSegment[] = opts.alreadyTranscribed.slice();

  const lastEnd = combined.length ? Math.max(...combined.map((s) => s.end)) : 0;
  if (lastEnd < opts.durationMs - 500) {
    const remainder = await transcribeBlob(opts.fullBlob);
    const tail = remainder.filter((seg) => seg.start >= lastEnd - 250);
    combined = combined.concat(tail);
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
