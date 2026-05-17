import { useEffect, useState } from 'react';
import { getMeeting } from '../../shared/storage/meetings';
import type { Meeting as MeetingT, ProcessingStatus } from '../../shared/schemas/meeting';
import { SummaryCard } from '../components/SummaryCard';
import { TranscriptView } from '../components/TranscriptView';
import {
  ActionsSection,
  DecisionsSection,
  QuestionsSection,
} from '../components/StructuredSections';
import { AskMeeting } from '../components/AskMeeting';
import { ExportBar } from '../components/ExportBar';
import { runProcessing } from '../../shared/pipeline/runProcessing';
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
  const [retrying, setRetrying] = useState(false);
  const [retryStatus, setRetryStatus] = useState<ProcessingStatus | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

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

  const retry = async () => {
    if (!meeting) return;
    setRetrying(true);
    setRetryError(null);
    setRetryStatus(null);
    try {
      await runProcessing({
        meetingId: meeting.id,
        onStatus: (s) => setRetryStatus(s),
      });
      const fresh = await getMeeting(meeting.id);
      if (fresh) setMeeting(fresh);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(false);
    }
  };

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
        {meeting.status !== 'ready' && (
          <span className="tag accent">status: {meeting.status}</span>
        )}
      </div>

      {meeting.status === 'error' && (
        <div className="card" style={{ borderColor: '#b3261e' }}>
          <h3>Processing failed</h3>
          <p className="muted">
            {meeting.errorMessage || 'An unknown error occurred while processing this meeting.'}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={retry}
            disabled={retrying}
            style={{ marginTop: 8 }}
          >
            {retrying ? `Retrying${retryStatus ? ` (${retryStatus})` : '...'}` : 'Retry processing'}
          </button>
          {retryError && (
            <p className="muted" style={{ color: '#b3261e', marginTop: 8 }}>
              {retryError}
            </p>
          )}
        </div>
      )}

      <SummaryCard bullets={meeting.summary} />
      <DecisionsSection items={meeting.decisions} />
      <ActionsSection items={meeting.actions} />
      <QuestionsSection items={meeting.questions} />

      <AskMeeting meetingId={meeting.id} />

      <ExportBar meeting={meeting} />

      <TranscriptView segments={meeting.segments} />
    </section>
  );
}
