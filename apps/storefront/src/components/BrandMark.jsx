export default function BrandMark({ subtitle, size = 44, showWordmark = true }) {
  const src = `${import.meta.env.BASE_URL}brand/logo.png`;
  return (
    <span className="brand-mark">
      <img src={src} alt="Khalyx Empire" width={size} height={size} />
      {showWordmark ? (
        <span className="brand-copy">
          Khalyx
          {subtitle ? <small>{subtitle}</small> : <small>Empire</small>}
        </span>
      ) : null}
    </span>
  );
}
