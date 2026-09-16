import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';
import { money } from '../lib/money.js';
import Seo from '../components/Seo.jsx';
import CartItem from '../components/CartItem.jsx';

const empty = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: 'Lagos',
  postalCode: ''
};

export default function Checkout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { items, subtotal, refresh, updateQty, remove } = useCart();
  const [form, setForm] = useState(empty);
  const [couponCode, setCouponCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [providers, setProviders] = useState(['simulate']);
  const [provider, setProvider] = useState('simulate');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
    api.get('/checkout/options').then(({ data }) => {
      setProviders(data.providers);
      setProvider(data.providers[0]);
    });
  }, [refresh]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name || '', email: user.email || '', phone: user.phone || '' }));
      api.get('/addresses').then(({ data }) => {
        const def = data.addresses.find((a) => a.isDefault) || data.addresses[0];
        if (def) {
          setForm((f) => ({
            ...f,
            name: def.fullName || f.name,
            phone: def.phone || f.phone,
            line1: def.line1,
            line2: def.line2 || '',
            city: def.city,
            state: def.state,
            postalCode: def.postalCode || ''
          }));
        }
      }).catch(() => {});
    }
  }, [user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const applyCoupon = async () => {
    const { data } = await api.post('/checkout/preview', { couponCode });
    setPreview(data);
  };

  const changeQty = async (id, qty) => {
    await updateQty(id, qty);
    if (couponCode) {
      const { data } = await api.post('/checkout/preview', { couponCode });
      setPreview(data);
    } else {
      setPreview(null);
    }
  };

  const removeItem = async (id) => {
    await remove(id);
    setPreview(null);
  };

  const place = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/checkout', {
        contact: { name: form.name, email: form.email, phone: form.phone },
        address: {
          fullName: form.name,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: 'Nigeria'
        },
        paymentProvider: provider,
        couponCode
      });
      sessionStorage.setItem('khalyx_order_email', form.email);
      await refresh();
      if (data.payment?.authorizationUrl) {
        window.location.href = data.payment.authorizationUrl;
        return;
      }
      navigate(`/order/${data.order.orderNumber}?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  if (!items.length) {
    return (
      <div className="section container empty">
        <p>Add something to the bag first.</p>
        <Link className="btn" to="/shop">
          Continue shopping
        </Link>
      </div>
    );
  }

  const totals = preview || { subtotal, discount: 0, shippingFee: subtotal >= 150000 ? 0 : 2500, total: subtotal + (subtotal >= 150000 ? 0 : 2500) };

  return (
    <div className="section">
      <Seo title="Checkout" path="/checkout" />
      <div className="container cart-layout">
        <form className="form" onSubmit={place}>
          <h1>Checkout</h1>
          <p className="muted">Guest checkout is welcome. Two steps: details, then pay.</p>
          {error ? <p className="alert">{error}</p> : null}
          {!user ? (
            <p className="muted">
              <Link to="/login?next=/checkout">Sign in with Google</Link> to autofill your details.
            </p>
          ) : null}
          <h3>Contact</h3>
          <input required placeholder="Full name" value={form.name} onChange={set('name')} />
          <div className="form-row">
            <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} />
            <input required placeholder="Phone" value={form.phone} onChange={set('phone')} />
          </div>
          <h3>Delivery</h3>
          <input required placeholder="Street address" value={form.line1} onChange={set('line1')} />
          <input placeholder="Apartment, landmark" value={form.line2} onChange={set('line2')} />
          <div className="form-row">
            <input required placeholder="City" value={form.city} onChange={set('city')} />
            <input required placeholder="State" value={form.state} onChange={set('state')} />
          </div>
          <h3>Pay</h3>
          <div className="chip-row">
            {providers.map((p) => (
              <button key={p} type="button" className={`chip ${provider === p ? 'on' : ''}`} onClick={() => setProvider(p)}>
                {p === 'simulate' ? 'Test payment' : p}
              </button>
            ))}
          </div>
          <button className="btn full" disabled={busy} type="submit">
            {busy ? 'Placing…' : `Pay ${money(totals.total)}`}
          </button>
        </form>
        <aside className="summary">
          <h3>Order</h3>
          {items.map((item) => (
            <CartItem key={item.id} item={item} onQty={changeQty} onRemove={removeItem} />
          ))}
          <hr className="line" />
          <div className="form-row">
            <input placeholder="Coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
            <button className="btn ghost" type="button" onClick={applyCoupon}>
              Apply
            </button>
          </div>
          {preview?.error ? <p className="alert">{preview.error}</p> : null}
          <p className="totals-row">
            Subtotal <span>{money(totals.subtotal)}</span>
          </p>
          <p className="totals-row">
            Discount <span>{money(totals.discount)}</span>
          </p>
          <p className="totals-row">
            Shipping <span>{money(totals.shippingFee)}</span>
          </p>
          <p className="totals-row">
            <strong>Total</strong> <strong>{money(totals.total)}</strong>
          </p>
        </aside>
      </div>
    </div>
  );
}
