export default function EmptyState({ title = 'Nothing here yet', body, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {body ? <p className="muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="skeleton-stack" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${92 - (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}
