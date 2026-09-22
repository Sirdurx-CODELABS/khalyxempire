import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { useLive } from '../hooks/useLive.js';
import Field from '../components/Field.jsx';

export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [hits, setHits] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ supplier: searchParams.get('supplier') || '', notes: '', invoiceRef: '', status: 'draft', items: [] });
  const [openId, setOpenId] = useState('');
  const [receiveQty, setReceiveQty] = useState({});
  const [error, setError] = useState('');

  const load = () => api.get('/erp/purchase-orders').then(({ data }) => setPos(data.purchaseOrders));

  useLive(() => {
    load();
    api.get('/erp/suppliers', { params: { status: 'approved' } }).then(({ data }) => {
      const next = data.suppliers || [];
      setSuppliers(next);
      setForm((f) => (f.supplier && !next.some((s) => s._id === f.supplier) ? { ...f, supplier: '' } : f));
    });
  }, 5000);

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
    setError('');
    try {
      await api.post('/erp/purchase-orders', form);
      setForm({ supplier: form.supplier, notes: '', invoiceRef: '', status: 'draft', items: [] });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create purchase order');
    }
  };

  const receive = async (po) => {
    const items = po.items
      .map((item) => ({ itemId: item._id, qty: Number(receiveQty[item._id] || 0) }))
      .filter((i) => i.qty > 0);
    if (!items.length) return;
    await api.post(`/erp/purchase-orders/${po._id}/receive`, { items, invoiceRef: po.invoiceRef });
    setReceiveQty({});
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Purchase orders</h1>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <DataTable
        rows={pos}
        searchKeys={['poNumber']}
        searchPlaceholder="PO number"
        columns={[
          { id: 'poNumber', header: 'PO', accessor: (po) => po.poNumber },
          { id: 'supplier', header: 'Supplier', accessor: (po) => po.supplier?.name || '' },
          { id: 'status', header: 'Status', accessor: (po) => po.status },
          {
            id: 'actions',
            header: 'Actions',
            sortable: false,
            cell: (po) => (
              <>
                <button className="btn ghost small" type="button" onClick={() => setOpenId(openId === po._id ? '' : po._id)}>
                  Receive
                </button>{' '}
                {po.status === 'draft' || po.status === 'ordered' ? (
                  <button className="btn ghost small" type="button" onClick={() => api.patch(`/erp/purchase-orders/${po._id}`, { status: 'sent' }).then(load)}>
                    Mark sent
                  </button>
                ) : null}
                {po.status === 'received' ? (
                  <button className="btn ghost small" type="button" onClick={() => api.patch(`/erp/purchase-orders/${po._id}`, { status: 'closed' }).then(load)}>
                    Close
                  </button>
                ) : null}
              </>
            )
          }
        ]}
      />
      {pos
        .filter((po) => po._id === openId)
        .map((po) => (
          <div className="panel" key={po._id} style={{ marginTop: 12 }}>
            {po.items.map((item) => (
              <p key={item._id}>
                {item.name} · ordered {item.qtyOrdered} · received {item.qtyReceived} · {money(item.unitCost)}
                <Field label="Qty to receive">
                  <input
                    type="number"
                    style={{ width: 80 }}
                    value={receiveQty[item._id] || ''}
                    onChange={(e) => setReceiveQty({ ...receiveQty, [item._id]: e.target.value })}
                  />
                </Field>
              </p>
            ))}
            <button className="btn" type="button" onClick={() => receive(po)}>
              Receive into inventory
            </button>{' '}
            <button className="btn ghost" type="button" onClick={() => api.post(`/erp/purchase-orders/${po._id}/labels`).then(() => alert('Label sheet queued — print in Labels'))}>
              Queue labels
            </button>
          </div>
        ))}

      <form className="panel form-grid" style={{ marginTop: 20 }} onSubmit={create}>
        <h2>New PO</h2>
        <Field label="Approved supplier" required>
          <select required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        {!suppliers.length ? <p className="muted">No approved suppliers yet. Add one and wait for Admin approval.</p> : null}
        <Field label="Supplier invoice / ref">
          <input value={form.invoiceRef} onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
          </select>
        </Field>
        <Field label="Find product">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
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
