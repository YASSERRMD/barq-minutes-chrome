export interface RecorderEvents {
  onChunk?: (chunk: Blob) => void;
  onError?: (err: Error) => void;
  onLevel?: (rms: number) => void;
  /**
   * Optional PCM tap. Receives mono Float32 samples at the AudioContext rate
   * (16 kHz). Frames arrive every ~100ms.
   */
  onPcm?: (frame: Float32Array) => void;
}

export interface RecorderHandle {
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string }>;
  abort: () => void;
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

  // Optional PCM tap via AudioWorklet. We only attach when the caller asked
  // for PCM, so simple recordings (no live ASR) skip the worklet load.
  let pcmNode: AudioWorkletNode | null = null;
  if (events.onPcm) {
    try {
      const workletUrl = chrome.runtime.getURL('public/audio/pcm-tap.worklet.js');
      await audioContext.audioWorklet.addModule(workletUrl);
      pcmNode = new AudioWorkletNode(audioContext, 'pcm-tap');
      pcmNode.port.onmessage = (event) => {
        const buffer = event.data as ArrayBuffer;
        events.onPcm?.(new Float32Array(buffer));
      };
      sourceNode.connect(pcmNode);
      // Worklet must be in the audio graph to run; route through a silent gain.
      const silent = audioContext.createGain();
      silent.gain.value = 0;
      pcmNode.connect(silent).connect(audioContext.destination);
    } catch (err) {
      events.onError?.(
        err instanceof Error ? err : new Error('Failed to attach PCM tap'),
      );
    }
  }

  let released = false;
  const releaseResources = () => {
    if (released) return;
    released = true;
    if (levelHandle !== null) cancelAnimationFrame(levelHandle);
    levelHandle = null;
    if (pcmNode) {
      try {
        pcmNode.port.onmessage = null;
        pcmNode.disconnect();
      } catch {
        // ignore
      }
      pcmNode = null;
    }
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // already stopped
      }
    });
    if (audioContext.state !== 'closed') {
      audioContext.close().catch(() => undefined);
    }
  };

  return {
    stop: () =>
      new Promise<{ blob: Blob; durationMs: number; mimeType: string }>((resolve) => {
        if (released) {
          resolve({
            blob: new Blob(chunks, { type: mimeType || 'audio/webm' }),
            durationMs: performance.now() - startedAt,
            mimeType: mimeType || 'audio/webm',
          });
          return;
        }
        recorder.onstop = () => {
          releaseResources();
          const blob = new Blob(chunks, {
            type: recorder.mimeType || mimeType || 'audio/webm',
          });
          const durationMs = performance.now() - startedAt;
          resolve({ blob, durationMs, mimeType: blob.type });
        };
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          recorder.onstop?.(new Event('stop'));
        }
      }),
    abort: () => {
      // Privacy-critical: release the microphone immediately. Do not emit a blob.
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // ignore
      }
      releaseResources();
    },
    pause: () => recorder.state === 'recording' && recorder.pause(),
    resume: () => recorder.state === 'paused' && recorder.resume(),
    isRecording: () => recorder.state === 'recording',
    getStream: () => stream,
    getAudioContext: () => audioContext,
    getSourceNode: () => sourceNode,
  };
}
