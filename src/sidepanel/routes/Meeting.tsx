export function Meeting({
  meetingId,
  onBack,
}: {
  meetingId: string | null;
  onBack: () => void;
}) {
  return (
    <section className="route">
      <header className="route-header">
        <button type="button" className="ghost-button" onClick={onBack}>
          Back
        </button>
        <h2>Meeting</h2>
      </header>
      <p className="muted">
        {meetingId ? `Meeting ${meetingId}` : 'No meeting selected.'}
      </p>
    </section>
  );
}
