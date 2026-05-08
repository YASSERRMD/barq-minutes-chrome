import { createMeeting, updateMeeting } from '../storage/meetings';
import { decodeUpload, transcribeUploadChunks } from './upload';
import { saveAudio } from '../storage/audio';
import type { Meeting } from '../schemas/meeting';

export interface RunUploadOptions {
  file: File;
  title: string;
  storeAudio: boolean;
  onProgress?: (segmentsCompleted: number, samplesProgressed: number, samplesTotal: number) => void;
}

export async function runUpload(options: RunUploadOptions): Promise<Meeting> {
  const meeting = await createMeeting({
    source: 'upload',
    title: options.title,
    storeAudio: options.storeAudio,
    status: 'preparing-models',
  });

  await updateMeeting(meeting.id, (m) => ({ ...m, status: 'transcribing' }));

  const { pcm, durationMs } = await decodeUpload(options.file);
  let count = 0;
  const segments = await transcribeUploadChunks({
    pcm,
    onProgress: (p, t) => options.onProgress?.(count, p, t),
    onSegment: (_seg) => {
      count += 1;
    },
  });

  if (options.storeAudio) {
    await saveAudio(meeting.id, options.file, durationMs);
  }

  return updateMeeting(meeting.id, (m) => ({
    ...m,
    durationMs,
    segments,
    status: 'extracting',
  }));
}
