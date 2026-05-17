import { useEffect, useRef, useState } from 'react';
import { startMicRecording, type RecorderHandle } from '../../shared/pipeline/recorder';
import { startLiveTranscriber, type LiveTranscriberHandle } from '../../shared/pipeline/liveTranscribe';
import { ensureSessions } from '../../shared/models/sessions';
import { createMeeting, updateMeeting } from '../../shared/storage/meetings';
import { finalizeRecording } from '../../shared/pipeline/finalize';
import { runProcessing } from '../../shared/pipeline/runProcessing';
import { Waveform } from '../components/Waveform';
import { ProcessingStates } from '../components/ProcessingStates';
import { ModelStatus } from '../components/ModelStatus';
import type { ProcessingStatus, TranscriptSegment } from '../../shared/schemas/meeting';
import { formatDuration } from '../../shared/utils/time';
import { LiveTranscript } from '../components/LiveTranscript';

export function Record({ onMeetingCreated }: { onMeetingCreated: (id: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'finalizing' | 'processing' | 'done' | 'error'>('idle');
  const [title, setTitle] = useState('');
  const [storeAudio, setStoreAudio] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<RecorderHandle | null>(null);
  const transcriberRef = useRef<LiveTranscriberHandle | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  // Synchronous mirror of `segments` state. Live transcribe callbacks push into
  // here so finalizeRecording sees the latest list even if a setSegments batch
  // is still queued by React.
  const segmentsRef = useRef<TranscriptSegment[]>([]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      transcriberRef.current?.stop();
      // Privacy: if the user navigates away mid-recording, release the mic
      // and drop any in-memory audio buffer. Do not persist a partial meeting.
      recorderRef.current?.abort();
      transcriberRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setPhase('recording');
    setStatus('preparing-models');
    try {
      await ensureSessions(['asr']);
      const meeting = await createMeeting({ source: 'record', title: title || 'Untitled meeting', storeAudio });
      setMeetingId(meeting.id);
      await updateMeeting(meeting.id, (m) => ({ ...m, status: 'transcribing' }));
      setStatus('transcribing');

      segmentsRef.current = [];
      setSegments([]);
      const transcriber = startLiveTranscriber({
        onSegment: (seg) => {
          segmentsRef.current = [...segmentsRef.current, seg];
          setSegments(segmentsRef.current);
        },
        onError: (err) => setError(err.message),
      });
      transcriberRef.current = transcriber;

      const handle = await startMicRecording({
        onPcm: (frame) => transcriber.pushPcm(frame),
        onLevel: (rms) => setLevel(rms),
        onError: (err) => setError(err.message),
      });
      recorderRef.current = handle;
      startedAtRef.current = performance.now();
      tickRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startedAtRef.current);
      }, 250);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !meetingId) return;
    setPhase('finalizing');
    if (tickRef.current) clearInterval(tickRef.current);
    try {
      const stopped = await recorderRef.current.stop();
      const transcriber = transcriberRef.current;
      if (transcriber) await transcriber.flushFinal();

      await finalizeRecording({
        meetingId,
        fullBlob: stopped.blob,
        durationMs: stopped.durationMs,
        storeAudio,
        alreadyTranscribed: segmentsRef.current,
      });

      setPhase('processing');
      await runProcessing({ meetingId, onStatus: setStatus });
      setPhase('done');
      onMeetingCreated(meetingId);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      transcriberRef.current?.stop();
      transcriberRef.current = null;
      recorderRef.current = null;
    }
  };

  const isRecording = phase === 'recording';
  const isWorking = phase === 'finalizing' || phase === 'processing';

  return (
    <section className="route">
      <header className="route-header">
        <h2>Record meeting</h2>
      </header>

      <ModelStatus />

      <div className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="input"
            value={title}
            disabled={isRecording || isWorking}
            placeholder="Weekly product sync"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <input
            id="store-audio"
            type="checkbox"
            checked={storeAudio}
            disabled={isRecording || isWorking}
            onChange={(e) => setStoreAudio(e.target.checked)}
          />
          <label htmlFor="store-audio">Store audio in browser (off by default)</label>
        </div>
        <Waveform level={level} recording={isRecording} />
        <div className="row between" style={{ marginTop: 12 }}>
          <span className="muted">{formatDuration(elapsedMs)}</span>
          {!isRecording && phase !== 'finalizing' && phase !== 'processing' ? (
            <button type="button" className="primary-button" onClick={startRecording}>
              Start recording
            </button>
          ) : (
            <button type="button" className="ghost-button" onClick={stopRecording} disabled={isWorking}>
              {isWorking ? 'Working...' : 'Stop and process'}
            </button>
          )}
        </div>
        {error && (
          <p className="muted" style={{ color: '#b3261e', marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      {(isRecording || isWorking || phase === 'done') && (
        <ProcessingStates status={status} />
      )}

      {segments.length > 0 && <LiveTranscript segments={segments} />}
    </section>
  );
}

