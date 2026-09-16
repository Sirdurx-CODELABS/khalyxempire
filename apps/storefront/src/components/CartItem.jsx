import { Link } from 'react-router-dom';
import { money } from '../lib/money.js';

export default function CartItem({ item, onQty, onRemove }) {
  return (
    <article className="card cart-line">
      <img src={item.image} alt="" />
      <div>
        <h3>{item.slug ? <Link to={`/product/${item.slug}`}>{item.name}</Link> : item.name}</h3>
        <p className="muted">
          {[item.size, item.color].filter(Boolean).join(' / ') || 'Standard'}
        </p>
        <p className="price">{money(item.price)}</p>
        {onQty ? (
          <div className="qty">
            <button type="button" aria-label="Decrease quantity" onClick={() => onQty(item.id, item.qty - 1)}>
              −
            </button>
            <span>{item.qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => onQty(item.id, item.qty + 1)}>
              +
            </button>
          </div>
        ) : (
          <p className="muted">{item.qty} in bag</p>
        )}
        {onRemove ? (
          <button className="text-btn" type="button" onClick={() => onRemove(item.id)}>
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}
