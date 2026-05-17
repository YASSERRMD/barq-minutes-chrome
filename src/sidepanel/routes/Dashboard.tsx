import { useEffect, useMemo, useState } from 'react';
import { listMeetingsDetailed } from '../../shared/storage/meetings';
import type { Meeting } from '../../shared/schemas/meeting';
import { formatDate, formatDuration } from '../../shared/utils/time';

export function Dashboard({ onOpenMeeting }: { onOpenMeeting: (id: string) => void }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listMeetingsDetailed()
      .then((result) => {
        if (!mounted) return;
        setMeetings(result.meetings);
        setInvalidCount(result.invalid);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.summary.some((s) => s.toLowerCase().includes(q)) ||
        m.decisions.some((d) => d.text.toLowerCase().includes(q)) ||
        m.actions.some((a) => a.text.toLowerCase().includes(q)) ||
        m.questions.some((qq) => qq.text.toLowerCase().includes(q)),
    );
  }, [meetings, query]);

  return (
    <section className="route">
      <header className="route-header">
        <h2>Meetings</h2>
      </header>
      <input
        className="input"
        placeholder="Search meetings, decisions, actions"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {invalidCount > 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          {invalidCount} meeting record{invalidCount === 1 ? '' : 's'} could not be loaded.
        </p>
      )}
      {loading ? (
        <p className="muted">Loading meetings...</p>
      ) : filtered.length === 0 ? (
        <p className="muted">
          {meetings.length === 0
            ? 'No meetings yet. Start a recording or upload audio.'
            : 'No meetings match your search.'}
        </p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.map((m) => (
            <div
              key={m.id}
              className="list-row"
              role="button"
              tabIndex={0}
              onClick={() => onOpenMeeting(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenMeeting(m.id);
              }}
            >
              <span className="title">{m.title}</span>
              <span className="meta">
                {formatDate(m.createdAt)} · {formatDuration(m.durationMs)} · {m.source}
              </span>
              {m.summary.length > 0 && (
                <span className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  {m.summary[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
