export function Upload({ onMeetingCreated }: { onMeetingCreated: (id: string) => void }) {
  return (
    <section className="route">
      <header className="route-header">
        <h2>Upload audio</h2>
      </header>
      <p className="muted">Upload UI will be wired in a later phase.</p>
      <button type="button" className="hidden" onClick={() => onMeetingCreated('placeholder')} aria-hidden="true" />
    </section>
  );
}
