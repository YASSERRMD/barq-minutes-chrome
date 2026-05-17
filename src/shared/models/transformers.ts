// Single shared loader for @huggingface/transformers. Avoids three separate
// dynamic imports (one per session loader) and centralises the env setup so
// allowLocalModels / useBrowserCache flips happen exactly once.

type TransformersModule = typeof import('@huggingface/transformers');

let transformersPromise: Promise<TransformersModule> | null = null;

export function getTransformers(): Promise<TransformersModule> {
  if (transformersPromise) return transformersPromise;
  transformersPromise = (async () => {
    const mod = await import('@huggingface/transformers');
    if (mod.env) {
      mod.env.allowLocalModels = false;
      mod.env.useBrowserCache = true;
    }
    return mod;
  })().catch((err) => {
    transformersPromise = null;
    throw err;
  });
  return transformersPromise;
}
