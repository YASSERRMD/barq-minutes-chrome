import { useEffect, useState } from 'react';
import { getMeeting } from '../../shared/storage/meetings';
import type { Meeting as MeetingT } from '../../shared/schemas/meeting';
import { SummaryCard } from '../components/SummaryCard';
import { TranscriptView } from '../components/TranscriptView';
import {
  ActionsSection,
  DecisionsSection,
  QuestionsSection,
} from '../components/StructuredSections';
import { AskMeeting } from '../components/AskMeeting';
import { formatDate, formatDuration } from '../../shared/utils/time';

export function Meeting({
  meetingId,
  onBack,
}: {
  meetingId: string | null;
  onBack: () => void;
}) {
  const [meeting, setMeeting] = useState<MeetingT | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!meetingId) {
      setMeeting(null);
      setLoading(false);
      return;
    }
    getMeeting(meetingId)
      .then((m) => {
        if (mounted) {
          setMeeting(m ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [meetingId]);

  if (loading) {
    return (
      <section className="route">
        <header className="route-header">
          <button type="button" className="ghost-button" onClick={onBack}>
            Back
          </button>
          <h2>Meeting</h2>
        </header>
        <p className="muted">Loading...</p>
      </section>
    );
  }

  if (!meeting) {
    return (
      <section className="route">
        <header className="route-header">
          <button type="button" className="ghost-button" onClick={onBack}>
            Back
          </button>
          <h2>Meeting</h2>
        </header>
        <p className="muted">Meeting not found.</p>
      </section>
    );
  }

  return (
    <section className="route">
      <header className="route-header">
        <button type="button" className="ghost-button" onClick={onBack}>
          Back
        </button>
        <h2>{meeting.title}</h2>
      </header>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="tag">{meeting.source}</span>
        <span className="tag">{formatDate(meeting.createdAt)}</span>
        <span className="tag">{formatDuration(meeting.durationMs)}</span>
      </div>

      <SummaryCard bullets={meeting.summary} />
      <DecisionsSection items={meeting.decisions} />
      <ActionsSection items={meeting.actions} />
      <QuestionsSection items={meeting.questions} />

      <AskMeeting meetingId={meeting.id} />

      <TranscriptView segments={meeting.segments} />
    </section>
  );
}
