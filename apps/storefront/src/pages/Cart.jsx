import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cartStore.js';
import { money } from '../lib/money.js';
import Seo from '../components/Seo.jsx';
import CartItem from '../components/CartItem.jsx';

export default function Cart() {
  const { items, subtotal, refresh, updateQty, remove } = useCart();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="section">
      <Seo title="Bag" path="/cart" />
      <div className="container">
        <h1>Your bag</h1>
        {items.length === 0 ? (
          <div className="empty">
            <p>The bag is empty.</p>
            <Link className="btn" to="/shop">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div>
              {items.map((item) => (
                <CartItem key={item.id} item={item} onQty={updateQty} onRemove={remove} />
              ))}
            </div>
            <aside className="summary">
              <h3>Summary</h3>
              <p className="totals-row">
                Subtotal <strong>{money(subtotal)}</strong>
              </p>
              <p className="muted">Shipping calculated at checkout.</p>
              <Link className="btn full" to="/checkout">
                Checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
