export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatTimestamp(ms: number): string {
  return formatDuration(ms);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function clampNonNegative(n: number): number {
  return n < 0 || !Number.isFinite(n) ? 0 : n;
}
