import { describe, expect, it } from 'vitest';
import { meetingToMarkdown } from './markdown';
import type { Meeting } from '../schemas/meeting';

const sampleMeeting: Meeting = {
  id: 'm1',
  title: 'Sample meeting',
  createdAt: 0,
  updatedAt: 0,
  durationMs: 65000,
  source: 'record',
  status: 'ready',
  storeAudio: false,
  segments: [
    { id: 's1', start: 0, end: 5000, text: 'Hello team.' },
    { id: 's2', start: 5000, end: 10000, text: 'Let us start.' },
    { id: 's3', start: 60000, end: 62000, text: 'Done.' },
  ],
  summary: ['Discussed pricing.', 'Reviewed roadmap.', 'Aligned on timelines.'],
  decisions: [{ id: 'd1', text: 'Ship pricing change next sprint.' }],
  actions: [{ id: 'a1', text: 'Draft pricing announcement.', owner: 'Dana', due: 'Friday' }],
  questions: [{ id: 'q1', text: 'Will EU tier change?' }],
};

const TIMESTAMP_REGEX = /\b\d{2}:\d{2}\b/;

describe('meetingToMarkdown', () => {
  it('includes all top-level sections', () => {
    const md = meetingToMarkdown(sampleMeeting);
    expect(md).toMatch(/^# Sample meeting/);
    expect(md).toContain('## Summary');
    expect(md).toContain('## Decisions');
    expect(md).toContain('## Action items');
    expect(md).toContain('## Open questions');
    expect(md).toContain('## Transcript');
  });

  it('does not emit timestamps in summary, decisions, actions, or questions', () => {
    const md = meetingToMarkdown(sampleMeeting);
    const sections = ['## Summary', '## Decisions', '## Action items', '## Open questions'];
    for (let i = 0; i < sections.length; i++) {
      const start = md.indexOf(sections[i]);
      const nextStart = sections
        .slice(i + 1)
        .map((s) => md.indexOf(s))
        .find((idx) => idx > start);
      const transcriptStart = md.indexOf('## Transcript');
      const end = Math.min(
        ...[nextStart, transcriptStart].filter((n): n is number => typeof n === 'number' && n > start),
      );
      const block = md.slice(start, end);
      expect(block).not.toMatch(TIMESTAMP_REGEX);
    }
  });

  it('emits timestamps inside the transcript section', () => {
    const md = meetingToMarkdown(sampleMeeting);
    const transcript = md.slice(md.indexOf('## Transcript'));
    expect(transcript).toMatch(TIMESTAMP_REGEX);
    expect(transcript).toContain('00:00');
    expect(transcript).toContain('01:00');
  });
});
