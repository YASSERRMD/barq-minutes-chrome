import type { Meeting } from '../schemas/meeting';
import { formatDate, formatDuration, formatTimestamp } from '../utils/time';

interface PdfBuilder {
  addPage(): void;
  setFont(name: string, style?: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  text(text: string | string[], x: number, y: number, opts?: Record<string, unknown>): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  save(filename: string): void;
}

const MARGIN = 48;
const LINE_HEIGHT = 16;

function slugify(s: string): string {
  // Keep Unicode characters (Arabic, CJK, etc.) so titles in non-Latin
  // scripts produce a meaningful filename. Only strip control chars and
  // filesystem-reserved characters.
  const cleaned = s
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 80) || 'meeting';
}

export async function downloadPdf(meeting: Meeting): Promise<void> {
  const mod = await import('jspdf');
  const Ctor = (mod as { jsPDF?: new () => PdfBuilder }).jsPDF ?? (mod as { default: new () => PdfBuilder }).default;
  const doc = new Ctor();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeHeading = (text: string, size: number) => {
    ensureSpace(size + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(10, 31, 68);
    doc.text(text, MARGIN, y);
    y += size + 6;
  };

  const writeText = (text: string, opts: { italic?: boolean; muted?: boolean; bullet?: boolean } = {}) => {
    doc.setFont('helvetica', opts.italic ? 'italic' : 'normal');
    doc.setFontSize(11);
    doc.setTextColor(opts.muted ? 75 : 10, opts.muted ? 91 : 31, opts.muted ? 122 : 68);
    const prefix = opts.bullet ? '• ' : '';
    const lines = doc.splitTextToSize(prefix + text, usableWidth);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
  };

  writeHeading(meeting.title, 18);
  writeText(
    `${formatDate(meeting.createdAt)} · ${formatDuration(meeting.durationMs)} · ${meeting.source}`,
    { italic: true, muted: true },
  );

  if (meeting.summary.length) {
    y += 6;
    writeHeading('Summary', 14);
    for (const b of meeting.summary) writeText(b, { bullet: true });
  }

  if (meeting.decisions.length) {
    y += 6;
    writeHeading('Decisions', 14);
    for (const d of meeting.decisions) {
      const speaker = d.speaker ? ` (${d.speaker})` : '';
      writeText(`${d.text}${speaker}`, { bullet: true });
    }
  }

  if (meeting.actions.length) {
    y += 6;
    writeHeading('Action items', 14);
    for (const a of meeting.actions) {
      const meta: string[] = [];
      if (a.owner) meta.push(`owner: ${a.owner}`);
      if (a.due) meta.push(`due: ${a.due}`);
      writeText(`${a.text}${meta.length ? ` (${meta.join(', ')})` : ''}`, { bullet: true });
    }
  }

  if (meeting.questions.length) {
    y += 6;
    writeHeading('Open questions', 14);
    for (const q of meeting.questions) {
      const speaker = q.speaker ? ` (${q.speaker})` : '';
      writeText(`${q.text}${speaker}`, { bullet: true });
    }
  }

  if (meeting.segments.length) {
    y += 6;
    writeHeading('Transcript', 14);
    for (const s of meeting.segments) {
      const speaker = s.speaker ? `${s.speaker}: ` : '';
      writeText(`[${formatTimestamp(s.start)}] ${speaker}${s.text}`);
    }
  }

  doc.save(`${slugify(meeting.title)}.pdf`);
}
