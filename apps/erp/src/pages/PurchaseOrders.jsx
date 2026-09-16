import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [hits, setHits] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ supplier: '', notes: '', items: [] });
  const [openId, setOpenId] = useState('');
  const [receiveQty, setReceiveQty] = useState({});

  const load = () => api.get('/erp/purchase-orders').then(({ data }) => setPos(data.purchaseOrders));

  useEffect(() => {
    load();
    api.get('/erp/suppliers').then(({ data }) => setSuppliers(data.suppliers));
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get('/erp/pos/lookup', { params: { q } });
      setHits(data.items);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  const search = async () => {
    if (!q.trim()) return;
    const { data } = await api.get('/erp/pos/lookup', { params: { q } });
    setHits(data.items);
  };

  const addItem = (hit) => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: hit.productId, variantId: hit.variantId, name: hit.name, sku: hit.sku, qtyOrdered: 6, unitCost: Math.round(hit.price * 0.45) }]
    }));
  };

  const create = async (e) => {
    e.preventDefault();
    await api.post('/erp/purchase-orders', form);
    setForm({ supplier: form.supplier, notes: '', items: [] });
    load();
  };

  const receive = async (po) => {
    const items = po.items
      .map((item) => ({ itemId: item._id, qty: Number(receiveQty[item._id] || 0) }))
      .filter((i) => i.qty > 0);
    if (!items.length) return;
    await api.post(`/erp/purchase-orders/${po._id}/receive`, { items });
    setReceiveQty({});
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Purchase orders</h1>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>PO</th>
            <th>Supplier</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pos.map((po) => (
            <tr key={po._id}>
              <td>{po.poNumber}</td>
              <td>{po.supplier?.name}</td>
              <td>{po.status}</td>
              <td>
                <button className="btn ghost" type="button" onClick={() => setOpenId(openId === po._id ? '' : po._id)}>
                  Receive
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pos
        .filter((po) => po._id === openId)
        .map((po) => (
          <div className="panel" key={po._id} style={{ marginTop: 12 }}>
            {po.items.map((item) => (
              <p key={item._id}>
                {item.name} · ordered {item.qtyOrdered} · received {item.qtyReceived} · {money(item.unitCost)}
                <input
                  type="number"
                  style={{ width: 80, marginLeft: 8 }}
                  placeholder="qty"
                  value={receiveQty[item._id] || ''}
                  onChange={(e) => setReceiveQty({ ...receiveQty, [item._id]: e.target.value })}
                />
              </p>
            ))}
            <button className="btn" type="button" onClick={() => receive(po)}>
              Receive into inventory
            </button>
          </div>
        ))}

      <form className="panel form-grid" style={{ marginTop: 20 }} onSubmit={create}>
        <h2>New PO</h2>
        <select required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
          <option value="">Supplier</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="toolbar" style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Find product" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn ghost" type="button" onClick={search}>
            Search
          </button>
        </div>
        {hits.map((h) => (
          <button key={h.variantId} className="hit" type="button" onClick={() => addItem(h)}>
            <span>
              {h.name} {h.size} {h.color}
            </span>
            <span>Add</span>
          </button>
        ))}
        {form.items.map((item, i) => (
          <p key={item.variantId}>
            {item.name} × {item.qtyOrdered} @ {money(item.unitCost)}
            <button
              type="button"
              className="btn ghost"
              style={{ marginLeft: 8 }}
              onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })}
            >
              Remove
            </button>
          </p>
        ))}
        <button className="btn" type="submit" disabled={!form.items.length}>
          Create PO
        </button>
      </form>
    </>
  );
}
