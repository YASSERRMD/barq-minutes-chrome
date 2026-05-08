export function Options() {
  return (
    <div className="options">
      <header className="options-header">
        <h1>Barq Minutes Settings</h1>
        <p className="muted">All processing runs locally. No data leaves this browser.</p>
      </header>

      <section className="options-section">
        <h2>Privacy</h2>
        <p>Audio storage is opt-in. Transcripts and metadata are stored only in IndexedDB.</p>
      </section>

      <section className="options-section">
        <h2>Models</h2>
        <p>Whisper, GLM5.1 distill, and MiniLM are loaded from browser cache after first download.</p>
      </section>

      <section className="options-section">
        <h2>Data</h2>
        <p>You can clear all meetings and indexes from the side panel settings.</p>
      </section>
    </div>
  );
}
