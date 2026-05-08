export function SummaryCard({ bullets }: { bullets: string[] }) {
  return (
    <div className="card">
      <h3>Summary</h3>
      {bullets.length === 0 ? (
        <p className="muted">No summary available.</p>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
