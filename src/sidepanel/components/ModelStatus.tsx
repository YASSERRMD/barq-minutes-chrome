import { useEffect, useState } from 'react';
import { onModelProgress } from '../../shared/models/sessions';
import type { ModelLoadProgress } from '../../shared/models/cache';
import { ALL_MODELS } from '../../shared/models/config';

function statusLabel(p?: ModelLoadProgress): string {
  if (!p) return 'Idle';
  switch (p.status) {
    case 'idle':
      return 'Idle';
    case 'downloading':
      return p.total
        ? `Downloading ${Math.floor(((p.loaded ?? 0) / p.total) * 100)}%`
        : 'Downloading';
    case 'loading-from-cache':
      return 'Loading from cache';
    case 'ready':
      return 'Ready';
    case 'error':
      return p.message ? `Error: ${p.message}` : 'Error';
  }
}

function progressPercent(p?: ModelLoadProgress): number {
  if (!p) return 0;
  if (p.status === 'ready') return 100;
  if (p.status === 'downloading' && p.total) {
    return Math.min(100, Math.floor(((p.loaded ?? 0) / p.total) * 100));
  }
  if (p.status === 'loading-from-cache') return 50;
  return 0;
}

export function ModelStatus() {
  const [progress, setProgress] = useState<Record<string, ModelLoadProgress>>({});

  useEffect(() => {
    return onModelProgress((p) => {
      setProgress((prev) => ({ ...prev, [p.modelId]: p }));
    });
  }, []);

  return (
    <div className="card">
      <h3>Local models</h3>
      <p className="muted">
        Models load from browser cache after first download. No network calls during inference.
      </p>
      <div className="stack" style={{ marginTop: 8 }}>
        {ALL_MODELS.map((m) => {
          const p = progress[m.repo];
          const pct = progressPercent(p);
          return (
            <div key={m.repo} className="stack" style={{ gap: 4 }}>
              <div className="row between">
                <span style={{ fontWeight: 600 }}>{m.description}</span>
                <span className="tag">{statusLabel(p)}</span>
              </div>
              <div className="progress-track">
                <div
                  className={p?.status === 'ready' ? 'progress-bar accent' : 'progress-bar'}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {m.repo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
