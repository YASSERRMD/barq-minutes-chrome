import { EMBEDDING_MODEL } from './config';
import { isCached, markCached, type ModelLoadProgress } from './cache';
import { hasWebGPU } from './whisper';

type ProgressCallback = (p: ModelLoadProgress) => void;

let pipelinePromise: Promise<unknown> | null = null;

async function loadTransformers() {
  const mod = await import('@huggingface/transformers');
  if (mod.env) {
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
  }
  return mod;
}

export async function loadEmbedder(onProgress?: ProgressCallback): Promise<unknown> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const cached = await isCached(EMBEDDING_MODEL.repo);
    onProgress?.({
      modelId: EMBEDDING_MODEL.repo,
      status: cached ? 'loading-from-cache' : 'downloading',
      message: cached ? 'Loading MiniLM from cache' : 'Downloading MiniLM model',
    });

    const tx = await loadTransformers();

    const pipe = await tx.pipeline('feature-extraction', EMBEDDING_MODEL.repo, {
      device: hasWebGPU() ? 'webgpu' : 'wasm',
      dtype: 'q8',
      progress_callback: (p: { loaded?: number; total?: number }) => {
        onProgress?.({
          modelId: EMBEDDING_MODEL.repo,
          status: cached ? 'loading-from-cache' : 'downloading',
          loaded: p.loaded,
          total: p.total,
        });
      },
    } as Parameters<typeof tx.pipeline>[2]);

    await markCached(EMBEDDING_MODEL.repo, 'embedding');
    onProgress?.({
      modelId: EMBEDDING_MODEL.repo,
      status: 'ready',
      message: 'Embedder ready',
    });

    return pipe;
  })().catch((err) => {
    pipelinePromise = null;
    onProgress?.({
      modelId: EMBEDDING_MODEL.repo,
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  return pipelinePromise;
}

export async function embedText(text: string): Promise<Float32Array> {
  const pipe = await loadEmbedder();
  const fn = pipe as (
    input: string | string[],
    opts: Record<string, unknown>,
  ) => Promise<{ data: Float32Array }>;
  const out = await fn(text, { pooling: 'mean', normalize: true });
  return out.data;
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const pipe = await loadEmbedder();
  const fn = pipe as (
    input: string | string[],
    opts: Record<string, unknown>,
  ) => Promise<{ data: Float32Array; dims: number[] }>;
  const out = await fn(texts, { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  const result: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) {
    result.push(out.data.slice(i * dim, (i + 1) * dim));
  }
  return result;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function disposeEmbedder(): void {
  pipelinePromise = null;
}
