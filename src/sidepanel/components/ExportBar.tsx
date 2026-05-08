import type { Meeting } from '../../shared/schemas/meeting';
import { downloadMarkdown } from '../../shared/export/markdown';
import { downloadPdf } from '../../shared/export/pdf';
import { useState } from 'react';

export function ExportBar({ meeting }: { meeting: Meeting }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMarkdown = () => {
    setError(null);
    try {
      downloadMarkdown(meeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onPdf = async () => {
    setError(null);
    setBusy(true);
    try {
      await downloadPdf(meeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Export</h3>
      <p className="muted" style={{ fontSize: 12 }}>
        Timestamps appear in the transcript only. Decisions, actions, questions, and the summary
        do not include timestamps.
      </p>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="ghost-button" onClick={onMarkdown} disabled={busy}>
          Export Markdown
        </button>
        <button type="button" className="primary-button" onClick={onPdf} disabled={busy}>
          {busy ? 'Generating...' : 'Export PDF'}
        </button>
      </div>
      {error && (
        <p className="muted" style={{ color: '#b3261e', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
