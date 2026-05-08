export interface RecorderEvents {
  onChunk?: (chunk: Blob) => void;
  onError?: (err: Error) => void;
  onLevel?: (rms: number) => void;
}

export interface RecorderHandle {
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string }>;
  pause: () => void;
  resume: () => void;
  isRecording: () => boolean;
  getStream: () => MediaStream;
  getAudioContext: () => AudioContext;
  getSourceNode: () => MediaStreamAudioSourceNode;
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export async function startMicRecording(events: RecorderEvents = {}): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
  });

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = performance.now();

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
      events.onChunk?.(e.data);
    }
  };
  recorder.onerror = (e) => {
    events.onError?.(new Error((e as ErrorEvent).message ?? 'Recorder error'));
  };

  recorder.start(1000);

  const audioContext = new AudioContext({ sampleRate: 16000 });
  const sourceNode = audioContext.createMediaStreamSource(stream);
  let levelHandle: number | null = null;
  if (events.onLevel) {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    sourceNode.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sumSquares = 0;
      for (let i = 0; i < buf.length; i++) sumSquares += buf[i] * buf[i];
      const rms = Math.sqrt(sumSquares / buf.length);
      events.onLevel?.(rms);
      levelHandle = requestAnimationFrame(tick);
    };
    levelHandle = requestAnimationFrame(tick);
  }

  return {
    stop: () =>
      new Promise<{ blob: Blob; durationMs: number; mimeType: string }>((resolve) => {
        recorder.onstop = () => {
          if (levelHandle) cancelAnimationFrame(levelHandle);
          stream.getTracks().forEach((t) => t.stop());
          audioContext.close().catch(() => undefined);
          const blob = new Blob(chunks, {
            type: recorder.mimeType || mimeType || 'audio/webm',
          });
          const durationMs = performance.now() - startedAt;
          resolve({ blob, durationMs, mimeType: blob.type });
        };
        recorder.stop();
      }),
    pause: () => recorder.state === 'recording' && recorder.pause(),
    resume: () => recorder.state === 'paused' && recorder.resume(),
    isRecording: () => recorder.state === 'recording',
    getStream: () => stream,
    getAudioContext: () => audioContext,
    getSourceNode: () => sourceNode,
  };
}
