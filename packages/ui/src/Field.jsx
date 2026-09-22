export default function Field({ label, hint, required, error, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <span className="field-label">
          {label}
          {required ? <em className="req" aria-hidden="true">*</em> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
