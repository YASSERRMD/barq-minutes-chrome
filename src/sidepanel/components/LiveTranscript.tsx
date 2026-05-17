import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '../../shared/schemas/meeting';
import { formatDuration } from '../../shared/utils/time';

/**
 * Streaming transcript view that:
 *  - announces additions to assistive tech via aria-live polite
 *  - auto-scrolls to the bottom when a new segment arrives, so the user
 *    is not stuck reading stale text once the visible region overflows
 */
export function LiveTranscript({ segments }: { segments: TranscriptSegment[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [segments.length]);

  return (
    <div className="card">
      <h3>Live transcript</h3>
      <div
        ref={scrollRef}
        className="stack"
        style={{ maxHeight: 240, overflowY: 'auto' }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Live transcript"
      >
        {segments.map((s) => (
          <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
            <span className="tag" style={{ minWidth: 56, textAlign: 'center' }}>
              {formatDuration(s.start)}
            </span>
            <span style={{ marginLeft: 8 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
