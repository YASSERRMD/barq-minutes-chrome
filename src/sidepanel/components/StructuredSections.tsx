import type { ActionItem, Decision, OpenQuestion } from '../../shared/schemas/meeting';

export function DecisionsSection({ items }: { items: Decision[] }) {
  return (
    <div className="card">
      <h3>Decisions</h3>
      {items.length === 0 ? (
        <p className="muted">No decisions captured.</p>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {items.map((d) => (
            <li key={d.id} style={{ marginBottom: 6 }}>
              {d.text}
              {d.speaker && (
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                  · {d.speaker}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ActionsSection({ items }: { items: ActionItem[] }) {
  return (
    <div className="card">
      <h3>Action items</h3>
      {items.length === 0 ? (
        <p className="muted">No action items captured.</p>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {items.map((a) => (
            <li key={a.id} style={{ marginBottom: 6 }}>
              {a.text}
              <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                {a.owner ? `· owner ${a.owner}` : ''} {a.due ? `· due ${a.due}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuestionsSection({ items }: { items: OpenQuestion[] }) {
  return (
    <div className="card">
      <h3>Open questions</h3>
      {items.length === 0 ? (
        <p className="muted">No open questions captured.</p>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {items.map((q) => (
            <li key={q.id} style={{ marginBottom: 6 }}>
              {q.text}
              {q.speaker && (
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                  · {q.speaker}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
