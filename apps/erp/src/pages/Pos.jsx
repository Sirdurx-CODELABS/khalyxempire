import { useEffect, useRef, useState } from 'react';
import { api, money } from '../api/client.js';
import { useOffline } from '../store/offlineStore.js';

export default function Pos() {
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const enqueue = useOffline((s) => s.enqueue);
  const online = useOffline((s) => s.online);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    const handle = setTimeout(async () => {
      try {
        const { data } = await api.get('/erp/pos/lookup', { params: term ? { q: term } : {} });
        setHits(data.items || []);
        const exact = data.items?.find((item) => item.barcode === term || item.sku === term);
        if (term && exact && term.length >= 8) {
          add(exact);
          setQ('');
        }
      } catch {
        setHits([]);
        if (!term) setError('Could not load live inventory. Check the API.');
      }
    }, term ? 220 : 0);
    return () => clearTimeout(handle);
  }, [q]);

  const search = async (term = q) => {
    if (!term.trim()) {
      setHits([]);
      return;
    }
    const { data } = await api.get('/erp/pos/lookup', { params: { q: term } });
    setHits(data.items);
    if (data.items.length === 1 && (term.length > 6 || data.items[0].barcode === term || data.items[0].sku === term)) {
      add(data.items[0]);
      setQ('');
      setHits([]);
    }
  };

  const add = (hit) => {
    setCart((rows) => {
      const existing = rows.find((r) => r.variantId === hit.variantId);
      if (existing) return rows.map((r) => (r.variantId === hit.variantId ? { ...r, qty: r.qty + 1 } : r));
      return [...rows, { ...hit, qty: 1 }];
    });
    setError('');
    setMessage('');
  };

  const setQty = (variantId, qty) => {
    setCart((rows) => rows.map((r) => (r.variantId === variantId ? { ...r, qty: Math.max(1, qty) } : r)).filter((r) => r.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change = method === 'cash' ? Math.max(0, Number(tendered || 0) - total) : 0;

  const pay = async () => {
    setError('');
    setMessage('');
    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        sku: i.sku,
        qty: i.qty,
        price: i.price
      })),
      discount: Number(discount) || 0,
      paymentMethod: method,
      tendered: method === 'cash' ? Number(tendered) || total : total,
      customerName,
      customerPhone
    };
    try {
      const { data } = await api.post('/erp/pos/sale', payload);
      setMessage(`Sale ${data.order.orderNumber} · ${money(data.order.total)} · change ${money(data.order.payment.change || 0)}`);
      setCart([]);
      setDiscount(0);
      setTendered('');
      setCustomerName('');
      setCustomerPhone('');
      inputRef.current?.focus();
    } catch (err) {
      if (!err.response || !online) {
        enqueue('pos.sale', payload);
        setMessage('Saved offline. Will sync when the network returns.');
        setCart([]);
        return;
      }
      setError(err.response?.data?.message || 'Sale failed');
    }
  };

  return (
    <div className="pos">
      <div>
        <div className="page-head">
          <h1>Point of sale</h1>
        </div>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Scan barcode or search name / SKU"
          />
        </form>
        <div className="hits" style={{ marginTop: 12 }}>
          {!q.trim() && hits.length ? <p className="muted">Live catalog</p> : null}
          {hits.map((h) => (
            <button key={h.variantId} className="hit" type="button" onClick={() => add(h)}>
              <span>
                <strong>{h.name}</strong>
                <div className="muted">
                  {h.size} {h.color} · {h.sku} · {h.stock} in stock
                </div>
              </span>
              <strong>{money(h.price)}</strong>
            </button>
          ))}
        </div>
      </div>
      <aside className="panel">
        <h2>Ticket</h2>
        {cart.length === 0 ? <p className="muted">Scan to start a sale.</p> : null}
        {cart.map((line) => (
          <div className="line" key={line.variantId}>
            <div>
              <strong>{line.name}</strong>
              <div className="muted">
                {line.size} {line.color}
              </div>
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
        <p>
          Subtotal {money(subtotal)}
          <br />
          <label>
            Discount ₦{' '}
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ width: 120 }} />
          </label>
        </p>
        <h2>Total {money(total)}</h2>
        <div className="form-grid">
          <input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
        <div className="pay-grid" style={{ margin: '12px 0' }}>
          {['cash', 'card', 'transfer'].map((m) => (
            <button key={m} className={`btn ${method === m ? '' : 'ghost'}`} type="button" onClick={() => setMethod(m)}>
              {m}
            </button>
          ))}
        </div>
        {method === 'cash' ? (
          <input type="number" placeholder="Cash tendered" value={tendered} onChange={(e) => setTendered(e.target.value)} />
        ) : null}
        {method === 'cash' && tendered ? <p>Change {money(change)}</p> : null}
        {error ? <p className="alert">{error}</p> : null}
        {message ? <p className="ok">{message}</p> : null}
        <button className="btn pay" type="button" disabled={!cart.length} onClick={pay} style={{ marginTop: 12 }}>
          Complete sale
        </button>
      </aside>
    </div>
  );
}
