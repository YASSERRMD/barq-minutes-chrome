import { ASR_MODEL } from './config';
import { isCached, markCached, type ModelLoadProgress } from './cache';
import { getTransformers } from './transformers';
import { getSettings } from '../storage/settings';

type ProgressCallback = (p: ModelLoadProgress) => void;

let pipelinePromise: Promise<unknown> | null = null;

export async function loadWhisper(onProgress?: ProgressCallback): Promise<unknown> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const cached = await isCached(ASR_MODEL.repo);
    onProgress?.({
      modelId: ASR_MODEL.repo,
      status: cached ? 'loading-from-cache' : 'downloading',
      message: cached ? 'Loading Whisper from cache' : 'Downloading Whisper model',
    });

    const tx = await getTransformers();
    const settings = await getSettings();
    const wantWebGPU = settings.webgpuEnabled && hasWebGPU();

    const pipe = await tx.pipeline('automatic-speech-recognition', ASR_MODEL.repo, {
      revision: ASR_MODEL.revision,
      device: wantWebGPU ? 'webgpu' : 'wasm',
      dtype: 'q8',
      progress_callback: (p: { progress?: number; loaded?: number; total?: number }) => {
        onProgress?.({
          modelId: ASR_MODEL.repo,
          status: cached ? 'loading-from-cache' : 'downloading',
          loaded: p.loaded,
          total: p.total,
        });
      },
    } as Parameters<typeof tx.pipeline>[2]);

    await markCached(ASR_MODEL.repo, 'asr');
    onProgress?.({
      modelId: ASR_MODEL.repo,
      status: 'ready',
      message: 'Whisper ready',
    });

    return pipe;
  })().catch((err) => {
    pipelinePromise = null;
    onProgress?.({
      modelId: ASR_MODEL.repo,
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  return pipelinePromise;
}

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function disposeWhisper(): void {
  pipelinePromise = null;
}
