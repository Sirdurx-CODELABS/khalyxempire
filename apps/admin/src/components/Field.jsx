export default function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
