import { useRef, useState } from 'react';
import { runUpload } from '../../shared/pipeline/runUpload';
import { ensureSessions } from '../../shared/models/sessions';
import { processMeeting } from '../../shared/pipeline/processMeeting';
import { indexMeetingForRag } from '../../shared/pipeline/ragIndex';
import { getMeeting } from '../../shared/storage/meetings';
import { isSupportedUploadType } from '../../shared/pipeline/upload';
import { ModelStatus } from '../components/ModelStatus';
import { ProcessingStates } from '../components/ProcessingStates';
import type { ProcessingStatus } from '../../shared/schemas/meeting';

export function Upload({ onMeetingCreated }: { onMeetingCreated: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [storeAudio, setStoreAudio] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progressLabel, setProgressLabel] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!isSupportedUploadType(f)) {
      setError('Unsupported file format');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const start = async () => {
    if (!file) return;
    setPhase('working');
    setError(null);
    try {
      setStatus('preparing-models');
      await ensureSessions(['asr']);
      setStatus('transcribing');
      const meeting = await runUpload({
        file,
        title: title || file.name,
        storeAudio,
        onProgress: (_count, p, t) => {
          if (t > 0) {
            setProgressLabel(`${Math.floor((p / t) * 100)}%`);
          }
        },
      });

      await ensureSessions(['llm', 'embedding']);
      setStatus('extracting');
      await processMeeting({ meetingId: meeting.id, onProgress: (e) => setStatus(e.status) });
      const m = await getMeeting(meeting.id);
      if (m) {
        setStatus('indexing');
        await indexMeetingForRag(meeting.id, m.segments);
      }
      setStatus('ready');
      setPhase('done');
      onMeetingCreated(meeting.id);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="route">
      <header className="route-header">
        <h2>Upload audio</h2>
      </header>

      <ModelStatus />

      <div className="card">
        <div className="field">
          <label htmlFor="upload-title">Title</label>
          <input
            id="upload-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={phase === 'working'}
            placeholder="Q3 strategy meeting"
          />
        </div>
        <div className="field">
          <label htmlFor="upload-file">Audio file</label>
          <input
            id="upload-file"
            type="file"
            ref={inputRef}
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.flac"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={phase === 'working'}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            mp3, m4a, wav, ogg, webm, flac
          </span>
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <input
            id="upload-store-audio"
            type="checkbox"
            checked={storeAudio}
            disabled={phase === 'working'}
            onChange={(e) => setStoreAudio(e.target.checked)}
          />
          <label htmlFor="upload-store-audio">Store audio in browser (off by default)</label>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={!file || phase === 'working'}
          onClick={start}
        >
          {phase === 'working' ? 'Processing...' : 'Transcribe and process'}
        </button>
        {error && (
          <p className="muted" style={{ color: '#b3261e', marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      {(phase === 'working' || phase === 'done') && (
        <ProcessingStates status={status} progressLabel={progressLabel} />
      )}
    </section>
  );
}
