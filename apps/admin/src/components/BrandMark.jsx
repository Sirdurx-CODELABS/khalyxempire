export default function BrandMark({ subtitle, size = 52 }) {
  const src = `${import.meta.env.BASE_URL}brand/logo.png`;
  return (
    <div className="brand">
      <img src={src} alt="Khalyx Empire" width={size} height={size} />
      <span>
        Khalyx
        <small>{subtitle}</small>
      </span>
    </div>
  );
}
