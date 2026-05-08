export function Record({ onMeetingCreated }: { onMeetingCreated: (id: string) => void }) {
  return (
    <section className="route">
      <header className="route-header">
        <h2>Record meeting</h2>
      </header>
      <p className="muted">Recording UI will be wired in a later phase.</p>
      <button type="button" className="hidden" onClick={() => onMeetingCreated('placeholder')} aria-hidden="true" />
    </section>
  );
}
