import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../../shared/storage/settings';
import { clearAllData } from '../../shared/storage/clear';
import { totalAudioBytes } from '../../shared/storage/audio';
import type { Settings } from '../../shared/schemas/settings';
import { hasWebGPU } from '../../shared/models/whisper';

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [audioBytes, setAudioBytes] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
    totalAudioBytes().then(setAudioBytes);
  }, []);

  if (!settings) {
    return (
      <section className="route">
        <header className="route-header">
          <h2>Settings</h2>
        </header>
        <p className="muted">Loading...</p>
      </section>
    );
  }

  const update = async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  };

  const onClearAll = async () => {
    if (!confirm('Delete all meetings, transcripts, audio, and indexes? This cannot be undone.'))
      return;
    setBusy(true);
    setMessage(null);
    try {
      await clearAllData({ keepSettings: true });
      const bytes = await totalAudioBytes();
      setAudioBytes(bytes);
      setMessage('All meeting data cleared.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="route">
      <header className="route-header">
        <h2>Settings</h2>
      </header>

      <div className="card">
        <h3>Privacy</h3>
        <p className="muted">All processing runs locally. No data leaves this browser.</p>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            id="store-audio-default"
            type="checkbox"
            checked={settings.storeAudioByDefault}
            onChange={(e) => update({ storeAudioByDefault: e.target.checked })}
          />
          <label htmlFor="store-audio-default">Store audio by default</label>
        </div>
      </div>

      <div className="card">
        <h3>Inference</h3>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            id="webgpu"
            type="checkbox"
            checked={settings.webgpuEnabled}
            onChange={(e) => update({ webgpuEnabled: e.target.checked })}
          />
          <label htmlFor="webgpu">Use WebGPU when available</label>
        </div>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {hasWebGPU() ? 'WebGPU is available in this browser.' : 'WebGPU is not available. Falling back to WASM.'}
        </p>
      </div>

      <div className="card">
        <h3>Data</h3>
        <p className="muted">Total audio stored: {formatBytes(audioBytes)}</p>
        <button
          type="button"
          className="ghost-button"
          disabled={busy}
          onClick={onClearAll}
          style={{ marginTop: 8 }}
        >
          Clear all meeting data
        </button>
        {message && (
          <p className="muted" style={{ marginTop: 8 }}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
