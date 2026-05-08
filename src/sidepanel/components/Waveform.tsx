import { useEffect, useRef } from 'react';

export function Waveform({ level, recording }: { level: number; recording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f7f8fa';
      ctx.fillRect(0, 0, w, h);

      const history = historyRef.current;
      const barCount = 60;
      const barWidth = w / barCount - 2;
      ctx.fillStyle = recording ? '#0A1F44' : '#cbd1dc';
      for (let i = 0; i < barCount; i++) {
        const value = history[history.length - barCount + i] ?? 0;
        const barHeight = Math.max(2, value * h * 1.6);
        ctx.fillRect(i * (barWidth + 2), (h - barHeight) / 2, barWidth, barHeight);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [recording]);

  useEffect(() => {
    const arr = historyRef.current;
    arr.push(level);
    if (arr.length > 240) arr.shift();
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform"
      style={{ width: '100%', height: 60, borderRadius: 8 }}
      aria-label="Recording waveform"
    />
  );
}
