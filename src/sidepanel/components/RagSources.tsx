import type { RagSource } from '../../shared/pipeline/ragRetrieve';
import { formatTimestamp } from '../../shared/utils/time';

export function RagSources({ sources }: { sources: RagSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="card">
      <h4>Sources from transcript</h4>
      <div className="stack">
        {sources.map((s, i) => (
          <div key={s.id} className="stack" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="tag">[{i + 1}]</span>
              <span className="tag accent">{formatTimestamp(s.start)}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                score {s.score.toFixed(2)}
              </span>
            </div>
            <p style={{ margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
