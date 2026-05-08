import { normalize, removeStopwords, stemNaive, tokenize } from '../utils/text';

export function canonicalize(text: string): string {
  const lowered = normalize(text);
  const stopless = removeStopwords(lowered);
  const tokens = tokenize(stopless).map(stemNaive);
  return tokens.join(' ');
}

export function pickLongest<T extends { text: string }>(items: T[]): T {
  let best = items[0];
  for (const it of items) {
    if (it.text.length > best.text.length) best = it;
  }
  return best;
}

export function mergeOptionalString(a: string | null | undefined, b: string | null | undefined): string | null | undefined {
  if (a && b) return a.length >= b.length ? a : b;
  return a ?? b;
}

export function mergeOptionalNumber(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}
