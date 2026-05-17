/* eslint-disable */
// PCM tap worklet. Forwards mono Float32 frames from the input to the main
// thread as ArrayBuffer messages. Runs in the AudioWorkletGlobalScope, so it
// has no DOM access; keep it self-contained.

class PcmTapProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = [];
    this.batchSamples = 0;
    // Emit roughly every 100ms at 16 kHz to keep main-thread overhead low.
    this.flushAtSamples = 1600;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    // Copy out of the worklet-owned buffer so the next callback can write.
    const copy = new Float32Array(channel.length);
    copy.set(channel);
    this.batch.push(copy);
    this.batchSamples += copy.length;

    if (this.batchSamples >= this.flushAtSamples) {
      const flat = new Float32Array(this.batchSamples);
      let offset = 0;
      for (const chunk of this.batch) {
        flat.set(chunk, offset);
        offset += chunk.length;
      }
      this.batch = [];
      this.batchSamples = 0;
      this.port.postMessage(flat.buffer, [flat.buffer]);
    }
    return true;
  }
}

registerProcessor('pcm-tap', PcmTapProcessor);
