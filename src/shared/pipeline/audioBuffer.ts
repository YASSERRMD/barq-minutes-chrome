export const TARGET_SAMPLE_RATE = 16000;

// Shared decoder context. Creating a new AudioContext per blob hits the
// browser cap (~6 simultaneous) and pays an unnecessary init cost on each
// upload window. We close+recreate on demand if a previous close raced.
let sharedDecoderContext: AudioContext | null = null;

function getDecoderContext(): AudioContext {
  if (sharedDecoderContext && sharedDecoderContext.state !== 'closed') {
    return sharedDecoderContext;
  }
  sharedDecoderContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  return sharedDecoderContext;
}

export async function disposeDecoderContext(): Promise<void> {
  const ctx = sharedDecoderContext;
  sharedDecoderContext = null;
  if (ctx && ctx.state !== 'closed') {
    await ctx.close().catch(() => undefined);
  }
}

export async function decodeBlobToMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = getDecoderContext();
  // decodeAudioData can detach its input ArrayBuffer; pass a fresh copy so the
  // caller-held blob remains decodable in a later call.
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  return downmixToMono16k(decoded, TARGET_SAMPLE_RATE);
}

export function downmixToMono16k(buffer: AudioBuffer, target = TARGET_SAMPLE_RATE): Float32Array {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }
  if (buffer.sampleRate === target) return mono;
  return resampleLinear(mono, buffer.sampleRate, target);
}

export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLen = Math.floor(input.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export function sliceMono(samples: Float32Array, fromMs: number, toMs: number): Float32Array {
  const from = Math.floor((fromMs / 1000) * TARGET_SAMPLE_RATE);
  const to = Math.min(samples.length, Math.floor((toMs / 1000) * TARGET_SAMPLE_RATE));
  return samples.slice(from, to);
}
