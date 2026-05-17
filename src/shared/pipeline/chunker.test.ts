import { describe, expect, it } from 'vitest';
import { chunkTranscriptForExtraction, chunkTranscriptForRag } from './chunker';
import type { TranscriptSegment } from '../schemas/meeting';

function buildSample(repeats = 60): TranscriptSegment[] {
  const sentences = [
    'We agreed to ship pricing change next sprint.',
    'Dana will draft the announcement by Friday.',
    'Open question: will EU tier change.',
    'We need to review the SDK release timeline.',
    'Maya will own the QA pass.',
  ];
  const segs: TranscriptSegment[] = [];
  let t = 0;
  for (let i = 0; i < repeats; i++) {
    segs.push({ id: `s${i}`, start: t, end: t + 4000, text: sentences[i % sentences.length] });
    t += 4000;
  }
  return segs;
}

describe('chunker', () => {
  it('produces at least one extraction window for a multi-minute transcript', () => {
    const windows = chunkTranscriptForExtraction(buildSample());
    expect(windows.length).toBeGreaterThanOrEqual(1);
  });

  it('extraction windows do not exceed targetChars by more than the boundary search width', () => {
    const windows = chunkTranscriptForExtraction(buildSample());
    for (const w of windows) {
      expect(w.text.length).toBeLessThanOrEqual(6800);
    }
  });

  it('windows are non-empty and monotonically ordered in time', () => {
    const windows = chunkTranscriptForExtraction(buildSample());
    let prevFrom = -1;
    for (const w of windows) {
      expect(w.text.length).toBeGreaterThan(0);
      expect(w.toMs).toBeGreaterThanOrEqual(w.fromMs);
      expect(w.fromMs).toBeGreaterThanOrEqual(prevFrom);
      prevFrom = w.fromMs;
    }
  });

  it('returns an empty list for empty input', () => {
    expect(chunkTranscriptForExtraction([])).toEqual([]);
    expect(chunkTranscriptForRag([])).toEqual([]);
  });

  it('rag chunks are shorter than extraction chunks', () => {
    const ragWindows = chunkTranscriptForRag(buildSample());
    const extractionWindows = chunkTranscriptForExtraction(buildSample());
    if (ragWindows.length > 0 && extractionWindows.length > 0) {
      const avgRag = ragWindows.reduce((a, w) => a + w.text.length, 0) / ragWindows.length;
      const avgExt = extractionWindows.reduce((a, w) => a + w.text.length, 0) / extractionWindows.length;
      expect(avgRag).toBeLessThan(avgExt);
    }
  });
});
