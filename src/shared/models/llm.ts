import { LLM_MODEL } from './config';
import { isCached, markCached, type ModelLoadProgress } from './cache';
import { hasWebGPU } from './whisper';
import { getTransformers } from './transformers';
import { getSettings } from '../storage/settings';

type ProgressCallback = (p: ModelLoadProgress) => void;

let pipelinePromise: Promise<unknown> | null = null;

export async function loadLLM(onProgress?: ProgressCallback): Promise<unknown> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const cached = await isCached(LLM_MODEL.repo);
    onProgress?.({
      modelId: LLM_MODEL.repo,
      status: cached ? 'loading-from-cache' : 'downloading',
      message: cached
        ? 'Loading GLM5.1 distill from cache'
        : 'Downloading GLM5.1 distill model',
    });

    const tx = await getTransformers();
    const settings = await getSettings();
    const wantWebGPU = settings.webgpuEnabled && hasWebGPU();

    const pipe = await tx.pipeline('text-generation', LLM_MODEL.repo, {
      device: wantWebGPU ? 'webgpu' : 'wasm',
      dtype: 'q4',
      progress_callback: (p: { progress?: number; loaded?: number; total?: number }) => {
        onProgress?.({
          modelId: LLM_MODEL.repo,
          status: cached ? 'loading-from-cache' : 'downloading',
          loaded: p.loaded,
          total: p.total,
        });
      },
    } as Parameters<typeof tx.pipeline>[2]);

    await markCached(LLM_MODEL.repo, 'llm');
    onProgress?.({
      modelId: LLM_MODEL.repo,
      status: 'ready',
      message: 'LLM ready',
    });

    return pipe;
  })().catch((err) => {
    pipelinePromise = null;
    onProgress?.({
      modelId: LLM_MODEL.repo,
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  return pipelinePromise;
}

export interface LlmGenerateOptions {
  prompt: string;
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
}

export async function generate(
  options: LlmGenerateOptions,
): Promise<string> {
  const pipe = await loadLLM();
  const fn = pipe as (
    text: string,
    opts: Record<string, unknown>,
  ) => Promise<Array<{ generated_text?: string }>>;
  const result = await fn(options.prompt, {
    max_new_tokens: options.maxNewTokens ?? 256,
    temperature: options.temperature ?? 0.1,
    top_p: options.topP ?? 0.95,
    do_sample: (options.temperature ?? 0.1) > 0,
    return_full_text: false,
  });
  const text = Array.isArray(result) ? result[0]?.generated_text ?? '' : '';
  return text;
}

export function disposeLLM(): void {
  pipelinePromise = null;
}
