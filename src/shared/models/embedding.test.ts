import { describe, expect, it } from 'vitest';
import { cosineSimilarity, dotProductNormalized } from './embedding';

function normalize(v: number[]): Float32Array {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / (n || 1);
  return out;
}

describe('cosine similarity', () => {
  it('returns 1 for identical normalized vectors', () => {
    const a = normalize([1, 2, 3]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 6);
    expect(dotProductNormalized(a, a)).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = normalize([1, 0]);
    const b = normalize([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 6);
    expect(dotProductNormalized(a, b)).toBeCloseTo(0, 6);
  });

  it('cosineSimilarity returns 0 for length mismatch', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
    expect(dotProductNormalized(a, b)).toBe(0);
  });

  it('handles zero vectors gracefully', () => {
    const a = new Float32Array([0, 0]);
    const b = new Float32Array([1, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});
