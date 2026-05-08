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
  ],
  summary: ['Discussed pricing.', 'Reviewed roadmap.', 'Aligned on timelines.'],
  decisions: [{ id: 'd1', text: 'Ship pricing change next sprint.' }],
  actions: [{ id: 'a1', text: 'Draft pricing announcement.', owner: 'Dana', due: 'Friday' }],
  questions: [{ id: 'q1', text: 'Will EU tier change?' }],
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function runExportFormattingTests(): void {
  const md = meetingToMarkdown(sampleMeeting);

  assert(md.startsWith('# Sample meeting'), 'title not at top');
  assert(md.includes('## Summary'), 'summary section missing');
  assert(md.includes('## Decisions'), 'decisions section missing');
  assert(md.includes('## Action items'), 'actions section missing');
  assert(md.includes('## Open questions'), 'questions section missing');
  assert(md.includes('## Transcript'), 'transcript section missing');

  const summaryBlock = md.split('## Summary')[1].split('##')[0];
  assert(!/00:0\d|01:0\d/.test(summaryBlock), 'summary unexpectedly contains timestamps');

  const decisionsBlock = md.split('## Decisions')[1].split('##')[0];
  assert(!/00:0\d|01:0\d/.test(decisionsBlock), 'decisions unexpectedly contain timestamps');

  const actionsBlock = md.split('## Action items')[1].split('##')[0];
  assert(!/00:0\d|01:0\d/.test(actionsBlock), 'actions unexpectedly contain timestamps');

  const questionsBlock = md.split('## Open questions')[1].split('##')[0];
  assert(!/00:0\d|01:0\d/.test(questionsBlock), 'questions unexpectedly contain timestamps');

  const transcriptBlock = md.split('## Transcript')[1];
  assert(/00:00/.test(transcriptBlock), 'transcript should contain timestamps');
}
