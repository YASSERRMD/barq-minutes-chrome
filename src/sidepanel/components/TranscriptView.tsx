import type { TranscriptSegment } from '../../shared/schemas/meeting';
import { formatTimestamp } from '../../shared/utils/time';

export function TranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  if (!segments.length) {
    return (
      <div className="card">
        <h3>Transcript</h3>
        <p className="muted">No transcript available.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>Transcript</h3>
      <div className="stack" style={{ maxHeight: 360, overflowY: 'auto' }}>
        {segments.map((s) => (
          <div key={s.id} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            <span className="tag" style={{ minWidth: 56, textAlign: 'center' }}>
              {formatTimestamp(s.start)}
            </span>
            <div>
              {s.speaker && (
                <span className="muted" style={{ fontSize: 12, marginRight: 6 }}>
                  {s.speaker}
                </span>
              )}
              <span>{s.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
