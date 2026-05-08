import { generate } from '../models/llm';
import type { TranscriptWindow } from './chunker';

const CHUNK_PROMPT = `Summarize this meeting transcript window in 1-2 short sentences.
Focus on what was discussed, not on extracted items. No timestamps. No quotes.

Window:
"""
{TEXT}
"""

Summary:`;

const FINAL_PROMPT = `You are creating the executive summary of an entire meeting from chunk summaries below.
Produce 3 to 6 concise bullets explaining what was discussed across the meeting as a whole.
Do not list extracted decisions, actions, or questions. Do not include timestamps.
Use plain prose. Each bullet should start on a new line and begin with "- ".

Chunk summaries:
"""
{TEXT}
"""

Final summary bullets:`;

async function summarizeChunk(window: TranscriptWindow): Promise<string> {
  const out = await generate({
    prompt: CHUNK_PROMPT.replace('{TEXT}', window.text),
    maxNewTokens: 120,
    temperature: 0.2,
  });
  return out.trim().split('\n').slice(0, 4).join(' ').trim();
}

function parseBullets(raw: string): string[] {
  const lines = raw.split('\n').map((l) => l.trim());
  const bullets: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('- ')) bullets.push(line.slice(2).trim());
    else if (line.startsWith('* ')) bullets.push(line.slice(2).trim());
    else if (/^\d+[.)]\s/.test(line)) bullets.push(line.replace(/^\d+[.)]\s/, '').trim());
  }
  if (bullets.length === 0 && raw.trim().length > 0) {
    return raw
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  return bullets.slice(0, 6);
}

export async function summarizeMeeting(windows: TranscriptWindow[]): Promise<string[]> {
  if (windows.length === 0) return [];
  const chunkSummaries: string[] = [];
  for (const w of windows) {
    chunkSummaries.push(await summarizeChunk(w));
  }
  const merged = chunkSummaries.filter(Boolean).join('\n');
  if (!merged) return [];
  const out = await generate({
    prompt: FINAL_PROMPT.replace('{TEXT}', merged),
    maxNewTokens: 320,
    temperature: 0.2,
  });
  const bullets = parseBullets(out);
  return bullets.length >= 3 ? bullets : bullets.length ? bullets : chunkSummaries.slice(0, 5);
}
