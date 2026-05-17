import { describe, expect, it } from 'vitest';
import { clampNonNegative, formatDate, formatDuration, formatTimestamp } from './time';

describe('formatDuration', () => {
  it('formats sub-minute durations as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(7000)).toBe('00:07');
    expect(formatDuration(60000)).toBe('01:00');
  });

  it('formats hour-plus durations as hh:mm:ss', () => {
    expect(formatDuration(3_600_000)).toBe('01:00:00');
    expect(formatDuration(3_661_000)).toBe('01:01:01');
  });

  it('treats negative and non-finite values as zero', () => {
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(Number.NaN)).toBe('00:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
  });

  it('formatTimestamp is an alias for formatDuration', () => {
    expect(formatTimestamp(123_000)).toBe(formatDuration(123_000));
  });
});

describe('formatDate', () => {
  it('returns a non-empty locale string for a valid timestamp', () => {
    expect(formatDate(0)).not.toBe('');
  });
});

describe('clampNonNegative', () => {
  it('returns the input for non-negative finite values', () => {
    expect(clampNonNegative(0)).toBe(0);
    expect(clampNonNegative(42)).toBe(42);
  });

  it('returns 0 for negative or non-finite values', () => {
    expect(clampNonNegative(-1)).toBe(0);
    expect(clampNonNegative(Number.NaN)).toBe(0);
    expect(clampNonNegative(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
