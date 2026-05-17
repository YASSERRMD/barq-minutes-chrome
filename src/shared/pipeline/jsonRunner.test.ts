import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { runJson, JsonRunModelError } from './jsonRunner';

vi.mock('../models/llm', () => ({
  generate: vi.fn(),
}));

import * as llm from '../models/llm';

const mockGenerate = vi.mocked(llm.generate);

const Schema = z.object({ items: z.array(z.string()) });

describe('runJson', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it('returns parsed JSON when the model produces a valid object', async () => {
    mockGenerate.mockResolvedValueOnce('{"items":["a","b"]}');
    const result = await runJson({ prompt: 'p' }, Schema);
    expect(result).toEqual({ items: ['a', 'b'] });
  });

  it('extracts JSON from inside a code fence', async () => {
    mockGenerate.mockResolvedValueOnce(
      'Sure, here you go:\n```json\n{"items":["x"]}\n```\n',
    );
    const result = await runJson({ prompt: 'p' }, Schema);
    expect(result).toEqual({ items: ['x'] });
  });

  it('retries with retryPrompt on malformed output', async () => {
    mockGenerate.mockResolvedValueOnce('nope.').mockResolvedValueOnce('{"items":["y"]}');
    const result = await runJson({ prompt: 'p', retryPrompt: 'strict' }, Schema);
    expect(result).toEqual({ items: ['y'] });
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('returns null after all retries fail to produce valid JSON', async () => {
    mockGenerate.mockResolvedValueOnce('nope').mockResolvedValueOnce('still nope');
    const result = await runJson({ prompt: 'p', retryPrompt: 'strict' }, Schema);
    expect(result).toBeNull();
  });

  it('throws JsonRunModelError when the model itself fails', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('WebGPU lost'));
    await expect(runJson({ prompt: 'p' }, Schema)).rejects.toBeInstanceOf(JsonRunModelError);
  });
});
