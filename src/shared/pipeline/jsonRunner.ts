import { z } from 'zod';
import { generate } from '../models/llm';

function extractJsonBlock(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = text.indexOf('{');
  const startArr = text.indexOf('[');
  if (start === -1 && startArr === -1) return null;
  const first = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  let depth = 0;
  let inStr = false;
  let escape = false;
  const openCh = text[first];
  const closeCh = openCh === '{' ? '}' : ']';
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return text.slice(first, i + 1);
    }
  }
  return null;
}

export interface JsonRunOptions {
  prompt: string;
  retryPrompt?: string;
  maxNewTokens?: number;
  temperature?: number;
}

export class JsonRunModelError extends Error {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Model call failed: ${message}`);
    this.name = 'JsonRunModelError';
  }
}

/**
 * Run an LLM call expecting JSON output validated by `schema`. Two distinct
 * failure modes:
 *   - The model itself errors (network on initial download, OOM, WebGPU
 *     reset). These throw `JsonRunModelError` so the caller can persist the
 *     meeting as `status: 'error'` instead of silently producing an empty
 *     extraction.
 *   - The model returns text that does not extract or parse against the
 *     schema. These are retried with the stricter prompt; if the retry also
 *     fails, returns `null` so the caller can default to `[]`.
 */
export async function runJson<T>(
  options: JsonRunOptions,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const attempts: string[] = [options.prompt];
  if (options.retryPrompt) attempts.push(options.retryPrompt);

  for (let i = 0; i < attempts.length; i++) {
    let out: string;
    try {
      out = await generate({
        prompt: attempts[i],
        maxNewTokens: options.maxNewTokens ?? 256,
        temperature: options.temperature ?? 0.1,
      });
    } catch (err) {
      // Model error is not recoverable by retrying the prompt; bubble it up.
      throw new JsonRunModelError(err);
    }
    const block = extractJsonBlock(out);
    if (!block) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    const validated = schema.safeParse(parsed);
    if (validated.success) return validated.data;
  }
  return null;
}
