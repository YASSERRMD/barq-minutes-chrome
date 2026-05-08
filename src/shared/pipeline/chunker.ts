import type { TranscriptSegment } from '../schemas/meeting';

export interface TranscriptWindow {
  text: string;
  fromMs: number;
  toMs: number;
  segmentIds: string[];
}

export function joinSegmentsToText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text))
    .join('\n');
}

interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
  boundarySearchChars?: number;
}

export function chunkTranscriptForExtraction(
  segments: TranscriptSegment[],
  options: ChunkOptions = {},
): TranscriptWindow[] {
  const targetChars = options.targetChars ?? 6000;
  const overlapChars = options.overlapChars ?? 600;
  const boundarySearchChars = options.boundarySearchChars ?? 200;

  if (segments.length === 0) return [];

  type IndexedSeg = TranscriptSegment & { offset: number };
  const indexed: IndexedSeg[] = [];
  let offset = 0;
  for (const s of segments) {
    indexed.push({ ...s, offset });
    offset += (s.speaker ? s.speaker.length + 2 : 0) + s.text.length + 1;
  }
  const fullText = joinSegmentsToText(segments);

  const windows: TranscriptWindow[] = [];
  let start = 0;

  while (start < fullText.length) {
    let end = Math.min(fullText.length, start + targetChars);

    if (end < fullText.length) {
      const searchStart = Math.max(start + targetChars - boundarySearchChars, start + 1);
      const searchEnd = Math.min(start + targetChars + boundarySearchChars, fullText.length);
      let bestBoundary = -1;
      for (let i = searchEnd; i >= searchStart; i--) {
        const ch = fullText[i];
        if (ch === '\n' || ch === '.' || ch === '?' || ch === '!') {
          bestBoundary = i + 1;
          break;
        }
      }
      if (bestBoundary > 0) end = bestBoundary;
    }

    const text = fullText.slice(start, end).trim();
    if (text.length === 0) {
      start = end;
      continue;
    }

    const inWindow = indexed.filter((s) => s.offset + s.text.length >= start && s.offset < end);
    const fromMs = inWindow.length ? inWindow[0].start : 0;
    const toMs = inWindow.length ? inWindow[inWindow.length - 1].end : fromMs;
    windows.push({
      text,
      fromMs,
      toMs,
      segmentIds: inWindow.map((s) => s.id),
    });

    if (end >= fullText.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return windows;
}

export function chunkTranscriptForRag(
  segments: TranscriptSegment[],
  approxTokens = 512,
  overlapTokens = 64,
): TranscriptWindow[] {
  const charsPerToken = 4;
  return chunkTranscriptForExtraction(segments, {
    targetChars: approxTokens * charsPerToken,
    overlapChars: overlapTokens * charsPerToken,
    boundarySearchChars: 80,
  });
}
