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
  let openCh = text[first];
  let closeCh = openCh === '{' ? '}' : ']';
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

export async function runJson<T>(
  options: JsonRunOptions,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const attempts: string[] = [options.prompt];
  if (options.retryPrompt) attempts.push(options.retryPrompt);

  for (let i = 0; i < attempts.length; i++) {
    try {
      const out = await generate({
        prompt: attempts[i],
        maxNewTokens: options.maxNewTokens ?? 256,
        temperature: options.temperature ?? 0.1,
      });
      const block = extractJsonBlock(out);
      if (!block) continue;
      const parsed = JSON.parse(block);
      const validated = schema.safeParse(parsed);
      if (validated.success) return validated.data;
    } catch {
      // continue retrying
    }
  }
  return null;
}
