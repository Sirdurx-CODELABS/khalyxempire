import { Link, useLocation } from 'react-router-dom';
import { money, firstPrice, comparePrice, firstInStockVariant, productCover } from '../lib/money.js';
import { useCart } from '../store/cartStore.js';
import { colorSwatch } from './Icons.jsx';

export default function ProductCard({ product }) {
  const location = useLocation();
  const add = useCart((s) => s.add);
  const cover = productCover(product);
  const variant = firstInStockVariant(product);
  const compare = comparePrice(product);
  const price = firstPrice(product);
  const from = `${location.pathname}${location.search}`;
  const colors = [...new Set((product.variants || []).map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];
  const needsChoice = colors.length > 1 || sizes.length > 1;

  const onAdd = async (e) => {
    e.preventDefault();
    if (!variant) return;
    await add({ productId: product._id, variantId: variant._id, qty: 1 });
  };

  return (
    <article className="card">
      <Link to={`/product/${product.slug}`} state={{ from }}>
        {cover ? (
          <img src={cover} alt={product.name} />
        ) : (
          <div className="card-photo-fallback" aria-hidden="true">
            KE
          </div>
        )}
      </Link>
      <div className="card-body">
        <p className="muted" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', margin: 0 }}>
          {product.category?.name || product.subcategory}
        </p>
        <h3>
          <Link to={`/product/${product.slug}`} state={{ from }}>
            {product.name}
          </Link>
        </h3>
        {colors.length ? (
          <div className="card-swatches">
            {colors.slice(0, 5).map((c) => (
              <span key={c} className="mini-swatch" style={{ background: colorSwatch(c) || '#cfc6b4' }} title={c} />
            ))}
          </div>
        ) : null}
        <p className="price">
          {compare > price ? <s>{money(compare)}</s> : null}
          {money(price)}
        </p>
        <div className="card-actions">
          {needsChoice ? (
            <Link className="btn" to={`/product/${product.slug}`} state={{ from }}>
              Choose options
            </Link>
          ) : (
            <button className="btn" type="button" onClick={onAdd} disabled={!variant?.stock}>
              Add to bag
            </button>
          )}
          <Link className="btn ghost" to={`/product/${product.slug}`} state={{ from }}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
