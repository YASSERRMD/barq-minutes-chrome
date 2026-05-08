import type { Meeting } from '../schemas/meeting';
import { formatDate, formatDuration, formatTimestamp } from '../utils/time';

export function meetingToMarkdown(meeting: Meeting): string {
  const lines: string[] = [];
  lines.push(`# ${meeting.title}`);
  lines.push('');
  lines.push(`*${formatDate(meeting.createdAt)} · ${formatDuration(meeting.durationMs)} · source: ${meeting.source}*`);
  lines.push('');

  if (meeting.summary.length) {
    lines.push('## Summary');
    for (const b of meeting.summary) lines.push(`- ${b}`);
    lines.push('');
  }

  if (meeting.decisions.length) {
    lines.push('## Decisions');
    for (const d of meeting.decisions) {
      const speaker = d.speaker ? ` _(${d.speaker})_` : '';
      lines.push(`- ${d.text}${speaker}`);
    }
    lines.push('');
  }

  if (meeting.actions.length) {
    lines.push('## Action items');
    for (const a of meeting.actions) {
      const meta: string[] = [];
      if (a.owner) meta.push(`owner: ${a.owner}`);
      if (a.due) meta.push(`due: ${a.due}`);
      lines.push(`- ${a.text}${meta.length ? ` _(${meta.join(', ')})_` : ''}`);
    }
    lines.push('');
  }

  if (meeting.questions.length) {
    lines.push('## Open questions');
    for (const q of meeting.questions) {
      const speaker = q.speaker ? ` _(${q.speaker})_` : '';
      lines.push(`- ${q.text}${speaker}`);
    }
    lines.push('');
  }

  if (meeting.segments.length) {
    lines.push('## Transcript');
    for (const s of meeting.segments) {
      const speaker = s.speaker ? `**${s.speaker}** ` : '';
      lines.push(`- \`${formatTimestamp(s.start)}\` ${speaker}${s.text}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(meeting: Meeting): void {
  const text = meetingToMarkdown(meeting);
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(meeting.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'meeting';
}
