import type { ProcessingStatus } from '../../shared/schemas/meeting';

const STAGES: { key: ProcessingStatus; label: string }[] = [
  { key: 'preparing-models', label: 'Preparing local models' },
  { key: 'transcribing', label: 'Transcribing audio' },
  { key: 'extracting', label: 'Extracting structured items' },
  { key: 'deduplicating', label: 'Deduplicating' },
  { key: 'summarizing', label: 'Generating complete summary' },
  { key: 'indexing', label: 'Indexing transcript for Q&A' },
  { key: 'ready', label: 'Ready' },
];

function stageIndex(status: ProcessingStatus): number {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function ProcessingStates({
  status,
  progressLabel,
}: {
  status: ProcessingStatus;
  progressLabel?: string;
}) {
  const current = stageIndex(status);
  return (
    <div className="card">
      <h3>Processing</h3>
      <div className="stack">
        {STAGES.map((s, i) => {
          const done = i < current || status === 'ready';
          const active = i === current && status !== 'ready';
          return (
            <div key={s.key} className="row" style={{ gap: 10 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: done ? '#C9A227' : active ? '#0A1F44' : '#cbd1dc',
                }}
              />
              <span style={{ fontWeight: active ? 600 : 400, color: active ? '#0A1F44' : '#4b5b7a' }}>
                {s.label}
              </span>
              {active && progressLabel && (
                <span className="muted" style={{ marginLeft: 8 }}>
                  {progressLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
