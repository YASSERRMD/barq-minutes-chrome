export function Dashboard({ onOpenMeeting }: { onOpenMeeting: (id: string) => void }) {
  return (
    <section className="route">
      <header className="route-header">
        <h2>Meetings</h2>
      </header>
      <p className="muted">No meetings yet. Start a recording or upload audio.</p>
      <button
        type="button"
        className="hidden"
        onClick={() => onOpenMeeting('placeholder')}
        aria-hidden="true"
      />
    </section>
  );
}
