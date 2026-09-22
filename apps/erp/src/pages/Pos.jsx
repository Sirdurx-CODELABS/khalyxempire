import { useEffect, useMemo, useRef, useState } from 'react';
import { computeBulkDiscount, DEFAULT_POS_BULK } from '@khalyx/shared';
import { api, money } from '../api/client.js';
import { useOffline } from '../store/offlineStore.js';
import Field from '../components/Field.jsx';
import { useLive } from '../hooks/useLive.js';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'account', label: 'On account' }
];

export default function Pos() {
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [picker, setPicker] = useState(null);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState([]);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponAmt, setCouponAmt] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [pays, setPays] = useState({ cash: '', card: '', transfer: '', account: '' });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [patron, setPatron] = useState(null);
  const [customerQ, setCustomerQ] = useState('');
  const [customerHits, setCustomerHits] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [held, setHeld] = useState([]);
  const [bulkSettings, setBulkSettings] = useState(DEFAULT_POS_BULK);
  const enqueue = useOffline((s) => s.enqueue);
  const online = useOffline((s) => s.online);

  const loadHeld = () => api.get('/erp/pos/held').then(({ data }) => setHeld(data.held || [])).catch(() => {});

  const loadCatalog = async (term = q, cat = category) => {
    try {
      const { data } = await api.get('/erp/pos/catalog', { params: { q: term || undefined, category: cat || undefined } });
      setProducts(data.products || []);
      if (data.settings?.posBulk) setBulkSettings(data.settings.posBulk);
      setError('');
      return data.exact || null;
    } catch {
      setProducts([]);
      if (!term) setError('Could not load live inventory. Check the API.');
      return null;
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    loadHeld();
    api.get('/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const term = q.trim();
    const handle = setTimeout(async () => {
      const exact = await loadCatalog(term, category);
      if (exact && term.length >= 8) {
        addVariant(exact);
        setQ('');
      }
    }, term ? 180 : 0);
    return () => clearTimeout(handle);
  }, [q, category]);

  useEffect(() => {
    setCouponAmt(0);
    setCouponMsg('');
    setCouponCode('');
  }, [cart]);

  useLive(() => {
    if (!q.trim()) loadCatalog('', category);
  }, 5000);

  useEffect(() => {
    const term = customerQ.trim();
    if (term.length < 2) {
      setCustomerHits([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get('/erp/pos/customers', { params: { q: term } });
      setCustomerHits(data.customers || []);
    }, 200);
    return () => clearTimeout(handle);
  }, [customerQ]);

  const addVariant = (hit) => {
    if (!hit?.stock) {
      setError(`${hit?.name || 'Item'} is out of stock`);
      return;
    }
    setCart((rows) => {
      const existing = rows.find((r) => r.variantId === hit.variantId);
      if (existing) return rows.map((r) => (r.variantId === hit.variantId ? { ...r, qty: r.qty + 1 } : r));
      return [...rows, { ...hit, qty: 1 }];
    });
    setToast({ name: hit.name, image: hit.image, detail: [hit.size, hit.color].filter(Boolean).join(' / ') });
    setError('');
    setMessage('');
    setPicker(null);
  };

  const chooseProduct = (product) => {
    const available = (product.variants || []).filter((v) => v.stock > 0);
    if (!available.length) {
      setError(`${product.name} is out of stock`);
      return;
    }
    if (available.length === 1) {
      addVariant(available[0]);
      return;
    }
    setPicker(product);
  };

  const setQty = (variantId, qty) => {
    setCart((rows) => rows.map((r) => (r.variantId === variantId ? { ...r, qty: Math.max(0, qty) } : r)).filter((r) => r.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const bulk = useMemo(
    () => computeBulkDiscount(cart, bulkSettings),
    [cart, bulkSettings]
  );
  const extra = Number(manualDiscount) || 0;
  const total = Math.max(0, subtotal - bulk.amount - couponAmt - extra);
  const splitSum = METHODS.reduce((s, m) => s + (Number(pays[m.id]) || 0), 0);
  const change = method === 'cash' && !split ? Math.max(0, Number(tendered || 0) - total) : 0;
  const bulkByVariant = Object.fromEntries(bulk.lines.map((line) => [String(line.variantId || line.key), line.amount]));

  const applyCoupon = async () => {
    setCouponMsg('');
    try {
      const { data } = await api.post('/erp/pos/coupon', {
        code: couponCode,
        subtotal: Math.max(0, subtotal - bulk.amount),
        items: cart.map((i) => ({ productId: i.productId, category: i.category }))
      });
      setCouponAmt(data.discount);
      setCouponMsg(`${data.code} applied · ${money(data.discount)} off`);
    } catch (err) {
      setCouponAmt(0);
      setCouponMsg(err.response?.data?.message || 'Coupon failed');
    }
  };

  const payload = () => ({
    items: cart.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      sku: i.sku,
      qty: i.qty,
      price: i.price
    })),
    manualDiscount: extra,
    couponCode,
    paymentMethod: method,
    payments: split
      ? METHODS.filter((m) => Number(pays[m.id]) > 0).map((m) => ({ method: m.id, amount: Number(pays[m.id]), tendered: Number(pays[m.id]) }))
      : undefined,
    tendered: method === 'cash' ? Number(tendered) || total : total,
    customerName,
    customerPhone,
    customerEmail,
    customerId: patron?.id,
    emailReceipt: Boolean(customerEmail)
  });

  const resetTicket = () => {
    setCart([]);
    setManualDiscount(0);
    setCouponCode('');
    setCouponAmt(0);
    setCouponMsg('');
    setTendered('');
    setPays({ cash: '', card: '', transfer: '', account: '' });
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setPatron(null);
    setCustomerQ('');
    setCustomerHits([]);
    inputRef.current?.focus();
  };

  const pay = async () => {
    setError('');
    setMessage('');
    const body = payload();
    if (split && !patron) {
      setError('Split payment is only for registered customers. Search and select a patron first.');
      return;
    }
    if (split && Math.abs(splitSum - total) > 1) {
      setError('Split amounts must equal the total');
      return;
    }
    try {
      const { data } = await api.post('/erp/pos/sale', body);
      setLastSale(data.order);
      setMessage(`Sale ${data.order.orderNumber} · ${money(data.order.total)}`);
      resetTicket();
      loadHeld();
      loadCatalog('', category);
    } catch (err) {
      if (!err.response || !online) {
        enqueue('pos.sale', body);
        setMessage('Saved offline. Will sync when the network returns.');
        resetTicket();
        return;
      }
      setError(err.response?.data?.message || 'Sale failed');
    }
  };

  const hold = async () => {
    await api.post('/erp/pos/held', { ...payload(), items: cart });
    setMessage('Sale held');
    resetTicket();
    loadHeld();
  };

  const resume = async (id) => {
    const { data } = await api.post(`/erp/pos/held/${id}/resume`);
    const h = data.held;
    setCart(h.items || []);
    setManualDiscount(h.manualDiscount || 0);
    setCouponCode(h.couponCode || '');
    setCouponAmt(0);
    setCustomerName(h.customerName || '');
    setCustomerPhone(h.customerPhone || '');
    setCustomerEmail(h.customerEmail || '');
    loadHeld();
  };

  return (
    <div className="pos pos-register">
      <div className="pos-catalog no-print">
        <div className="page-head">
          <h1>Point of sale</h1>
        </div>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Field label="Scan or search products">
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
        </form>
        <div className="pos-cats">
          <button className={`chip ${!category ? 'on' : ''}`} type="button" onClick={() => setCategory('')}>
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`chip ${category === cat._id ? 'on' : ''}`}
              type="button"
              onClick={() => setCategory(cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="pos-grid">
          {products.map((product) => (
            <button key={product.productId} className="pos-card" type="button" onClick={() => chooseProduct(product)} disabled={!product.stock}>
              <span className="pos-card-img">{product.image ? <img src={product.image} alt="" /> : <span className="pos-card-empty">KE</span>}</span>
              <strong>{product.name}</strong>
              <span className="pos-card-meta">
                {money(product.priceFrom)}
                {product.variantCount > 1 ? ' · options' : ''}
              </span>
              <span className={`pos-stock ${product.stock < 5 ? 'low' : ''}`}>{product.stock} in stock</span>
            </button>
          ))}
        </div>
        {held.length ? (
          <div className="held-row">
            {held.map((h) => (
              <button key={h._id} className="btn ghost" type="button" onClick={() => resume(h._id)}>
                Resume {h.customerName || 'ticket'} · {h.items?.length || 0}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="pos-ticket panel no-print">
        <h2>Cart</h2>
        {cart.length === 0 ? <p className="muted">Tap a product to start.</p> : null}
        {cart.map((line) => (
          <div className="cart-line" key={line.variantId}>
            {line.image ? <img src={line.image} alt="" /> : <span className="pos-card-empty sm">KE</span>}
            <div>
              <strong>{line.name}</strong>
              <div className="muted">
                {[line.size, line.color].filter(Boolean).join(' / ') || line.sku} · {money(line.price)}
              </div>
              {bulkByVariant[String(line.variantId)] ? <div className="bulk-tag">Bulk −{money(bulkByVariant[String(line.variantId)])}</div> : null}
              <div className="qty">
                <button type="button" onClick={() => setQty(line.variantId, line.qty - 1)}>
                  −
                </button>
                <span>{line.qty}</span>
                <button type="button" onClick={() => setQty(line.variantId, line.qty + 1)}>
                  +
                </button>
              </div>
            </div>
            <strong>{money(line.price * line.qty)}</strong>
          </div>
        ))}
        <div className="totals">
          <p>
            <span>Subtotal</span> <span>{money(subtotal)}</span>
          </p>
          {bulk.amount ? (
            <p className="discount-line">
              <span>Bulk Discount ({bulk.percent}%)</span> <span>−{money(bulk.amount)}</span>
            </p>
          ) : null}
          {couponAmt ? (
            <p className="discount-line">
              <span>Coupon {couponCode}</span> <span>−{money(couponAmt)}</span>
            </p>
          ) : null}
          {extra ? (
            <p className="discount-line">
              <span>Manual discount</span> <span>−{money(extra)}</span>
            </p>
          ) : null}
          <h2>
            <span>Total</span> <span>{money(total)}</span>
          </h2>
        </div>
        <div className="ticket-form">
          <div className="coupon-row">
            <Field label="Coupon code">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
            </Field>
            <button className="btn ghost" type="button" disabled={!couponCode || !cart.length} onClick={applyCoupon}>
              Apply
            </button>
          </div>
          {couponMsg ? <p className="muted">{couponMsg}</p> : null}
          <Field label="Extra discount (₦)">
            <input type="number" value={manualDiscount} onChange={(e) => setManualDiscount(e.target.value)} />
          </Field>
          <Field label="Walk-in name">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={Boolean(patron)} />
          </Field>
          <Field label="Phone">
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={Boolean(patron)} />
          </Field>
          <Field label="Email for receipt">
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </Field>
          <Field label="Search existing customer" hint="Name, phone, customer ID, or email — required for split payment">
            <input value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} />
          </Field>
          {patron ? (
            <p className="ok">
              {patron.name} · {patron.phone || patron.email}
              {patron.accountBalance ? ` · owes ${money(patron.accountBalance)}` : ''}
              <button
                className="btn small ghost"
                type="button"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setPatron(null);
                  setSplit(false);
                }}
              >
                Clear
              </button>
            </p>
          ) : null}
          {customerHits.map((c) => (
            <button
              key={c.id}
              className="hit"
              type="button"
              onClick={() => {
                setPatron(c);
                setCustomerName(c.name);
                setCustomerPhone(c.phone || '');
                setCustomerEmail(c.email || '');
                setCustomerHits([]);
                setCustomerQ('');
              }}
            >
              <span>
                {c.name}
                <br />
                <small>
                  {c.phone} {c.email}
                </small>
              </span>
              <span>Select</span>
            </button>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={split}
              disabled={!patron}
              onChange={(e) => {
                if (e.target.checked && !patron) {
                  setError('Register or select a customer before using split payment. Walk-in sales use a single method.');
                  setSplit(false);
                  return;
                }
                setError('');
                setSplit(e.target.checked);
              }}
            />{' '}
            Split payment
          </label>
          {!patron ? (
            <p className="muted">Split payment is for registered patrons only. Search and select a customer first, or complete a single payment for walk-ins.</p>
          ) : null}
          {split && !patron ? (
            <p className="field-error">No matching customer selected. Register them first or complete a standard single payment.</p>
          ) : null}
          {split && patron ? (
            <div className="pay-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {METHODS.map((m) => (
                <Field key={m.id} label={m.label}>
                  <input type="number" value={pays[m.id] || ''} onChange={(e) => setPays({ ...pays, [m.id]: e.target.value })} />
                </Field>
              ))}
              <p className="muted">
                Split {money(splitSum)} / {money(total)}
              </p>
            </div>
          ) : (
            <>
              <div className="pay-grid">
                {METHODS.filter((m) => m.id !== 'account').map((m) => (
                  <button key={m.id} className={`btn ${method === m.id ? '' : 'ghost'}`} type="button" onClick={() => setMethod(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
              {method === 'cash' ? (
                <Field label="Cash tendered">
                  <input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} />
                </Field>
              ) : null}
              {method === 'cash' && tendered ? <p>Change {money(change)}</p> : null}
            </>
          )}
          {error ? <p className="alert">{error}</p> : null}
          {message ? <p className="ok">{message}</p> : null}
          <button className="btn pay" type="button" disabled={!cart.length} onClick={pay}>
            Complete sale {cart.length ? money(total) : ''}
          </button>
          <button className="btn ghost" type="button" disabled={!cart.length} onClick={hold}>
            Hold sale
          </button>
          {lastSale ? (
            <button className="btn ghost" type="button" onClick={() => window.print()}>
              Print last receipt
            </button>
          ) : null}
        </div>
      </aside>

      {picker ? (
        <div className="pos-modal no-print" onClick={() => setPicker(null)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{picker.name}</h2>
            <p className="muted">Choose size / colour</p>
            <div className="variant-grid">
              {picker.variants.map((variant) => (
                <button
                  key={variant.variantId}
                  className="variant-btn"
                  type="button"
                  disabled={!variant.stock}
                  onClick={() => addVariant(variant)}
                >
                  {variant.image ? <img src={variant.image} alt="" /> : null}
                  <strong>
                    {[variant.size, variant.color].filter(Boolean).join(' / ') || 'OS'}
                  </strong>
                  <span>{money(variant.price)}</span>
                  <span className="muted">{variant.stock} left</span>
                </button>
              ))}
            </div>
            <button className="btn ghost" type="button" onClick={() => setPicker(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pos-toast no-print">
          {toast.image ? <img src={toast.image} alt="" /> : null}
          <span>
            Added {toast.name}
            {toast.detail ? ` · ${toast.detail}` : ''}
          </span>
        </div>
      ) : null}

      {lastSale ? (
        <div className="receipt print-only">
          <h2>Khalyx Empire</h2>
          <p>{lastSale.orderNumber}</p>
          <p>{new Date(lastSale.paidAt || lastSale.createdAt).toLocaleString()}</p>
          {lastSale.items.map((i) => (
            <p key={i.sku}>
              {i.qty}× {i.name} {i.size} {i.color} — {money(i.price * i.qty)}
            </p>
          ))}
          <p>Subtotal {money(lastSale.subtotal)}</p>
          {(lastSale.discountBreakdown || []).map((row) => (
            <p key={row.label}>
              {row.label}: −{money(row.amount)}
            </p>
          ))}
          {!(lastSale.discountBreakdown || []).length && lastSale.discount ? <p>Discount {money(lastSale.discount)}</p> : null}
          <h3>Total {money(lastSale.total)}</h3>
          <p>
            {(lastSale.payments?.length ? lastSale.payments : [{ method: lastSale.payment?.provider, amount: lastSale.total }])
              .map((p) => `${p.method} ${money(p.amount)}`)
              .join(' · ')}
          </p>
          {lastSale.payment?.change ? <p>Change {money(lastSale.payment.change)}</p> : null}
          <p>Thank you</p>
        </div>
      ) : null}
    </div>
  );
}
