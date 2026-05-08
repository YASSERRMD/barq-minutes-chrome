import { chunkTranscriptForExtraction, chunkTranscriptForRag } from './chunker';
import type { TranscriptSegment } from '../schemas/meeting';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const sample: TranscriptSegment[] = (() => {
  const segs: TranscriptSegment[] = [];
  const sentences = [
    'We agreed to ship pricing change next sprint.',
    'Dana will draft the announcement by Friday.',
    'Open question: will EU tier change.',
    'We need to review the SDK release timeline.',
    'Maya will own the QA pass.',
  ];
  let t = 0;
  let id = 0;
  for (let i = 0; i < 60; i++) {
    const text = sentences[i % sentences.length];
    segs.push({ id: `s${id++}`, start: t, end: t + 4000, text });
    t += 4000;
  }
  return segs;
})();

export function runSampleTranscriptTests(): void {
  const extractionWindows = chunkTranscriptForExtraction(sample);
  assert(extractionWindows.length >= 1, 'expected at least one extraction window');
  assert(
    extractionWindows.every((w) => w.text.length <= 6800),
    'extraction window exceeded 6800 chars',
  );
  assert(
    extractionWindows.every((w) => w.toMs >= w.fromMs),
    'window time order broken',
  );

  const ragWindows = chunkTranscriptForRag(sample);
  assert(ragWindows.length >= 1, 'expected at least one rag window');
  assert(ragWindows.every((w) => w.text.length > 0), 'empty rag window');
}
