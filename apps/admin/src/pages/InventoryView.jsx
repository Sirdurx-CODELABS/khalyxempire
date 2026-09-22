import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { STOCK_ADJUST_REASONS } from '@khalyx/shared';
import { DataTable, Skeleton } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import AdjustStockModal from '../components/AdjustStockModal.jsx';
import { useLive } from '../hooks/useLive.js';

const TYPE_LABEL = {
  sale: 'Sale',
  receive: 'Addition',
  adjustment: 'Adjustment',
  return: 'Return',
  reserve: 'Reserve',
  release: 'Release'
};

export default function InventoryView() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [sales, setSales] = useState({ week: {}, month: {}, all: {} });
  const [hero, setHero] = useState(0);
  const [thresholds, setThresholds] = useState({});
  const [adjustOpen, setAdjustOpen] = useState(params.get('adjust') === '1');
  const [supplierId, setSupplierId] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const apply = (data) => {
    setProduct(data.product);
    setMovements(data.movements || []);
    setSales(data.sales || { week: {}, month: {}, all: {} });
    const next = {};
    for (const v of data.product?.variants || []) next[v._id] = v.lowStockThreshold ?? 5;
    setThresholds(next);
    if (!supplierId && data.product?.suppliers?.length) {
      const approved = data.product.suppliers.find((s) => s.status === 'approved');
      setSupplierId(String((approved || data.product.suppliers[0])._id));
    }
  };

  const load = async () => {
    try {
      const { data } = await api.get(`/admin/inventory/${id}`);
      apply(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Inventory record not found');
    }
  };

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [id]);

  const saveThresholds = async () => {
    const variants = Object.entries(thresholds).map(([variantId, lowStockThreshold]) => ({ variantId, lowStockThreshold }));
    const { data } = await api.patch(`/admin/inventory/${id}/thresholds`, { variants });
    apply(data);
    setNotice('Low-stock thresholds saved.');
  };

  const requestSupply = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/inventory/${id}/supply-request`, { supplierId, message: requestMsg });
      setRequestMsg('');
      setNotice('Supply request sent. Admin will see it on Suppliers.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send supply request');
    }
  };

  if (error && !product) return <p className="alert">{error}</p>;
  if (!product) return <Skeleton rows={10} />;

  const images = product.images?.length ? product.images : [];

  return (
    <>
      <div className="page-head">
        <h1>{product.name}</h1>
        <Link className="btn ghost" to="/inventory">
          Back to inventory
        </Link>
        <button className="btn" type="button" onClick={() => setAdjustOpen(true)}>
          Adjust stock
        </button>
      </div>
      {notice ? <p className="ok">{notice}</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      <section className="stats">
        <article className="stat">
          <span>This week</span>
          <strong>{sales.week?.units || 0}</strong>
          <p className="muted">{money(sales.week?.revenue || 0)}</p>
        </article>
        <article className="stat">
          <span>This month</span>
          <strong>{sales.month?.units || 0}</strong>
          <p className="muted">{money(sales.month?.revenue || 0)}</p>
        </article>
        <article className="stat">
          <span>All-time</span>
          <strong>{sales.all?.units || 0}</strong>
          <p className="muted">{money(sales.all?.revenue || 0)}</p>
        </article>
        <article className="stat">
          <span>Stock value</span>
          <strong>{money(product.stockValue || 0)}</strong>
          <p className="muted">
            {product.totalStock} units · <span className={`badge ${product.stockStatus}`}>{String(product.stockStatus || '').replace(/_/g, ' ')}</span>
          </p>
        </article>
      </section>
      <div className="split wide" style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          {images[0] ? (
            <img src={images[hero] || images[0]} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} />
          ) : (
            <p className="muted">No product images yet.</p>
          )}
          <div className="gallery-list" style={{ marginTop: 10 }}>
            {images.map((src, i) => (
              <button key={src} type="button" className={`gallery-item ${i === hero ? 'is-primary' : ''}`} onClick={() => setHero(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <p>
            <strong>Category</strong> {product.category?.name || product.category || '—'}
          </p>
          <p className="muted">Last updated {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '—'}</p>
          <h3>Suppliers</h3>
          {(product.suppliers || []).length === 0 ? (
            <p className="muted">
              No suppliers linked. Add them on the <Link to={`/products/${product._id}/edit`}>product record</Link>.
            </p>
          ) : (
            (product.suppliers || []).map((s) => (
              <p key={s._id}>
                <Link to={`/suppliers?id=${s._id}`}>{s.name}</Link>{' '}
                <span className={`badge ${s.status}`}>{s.status}</span>
                <span className="muted"> · {s.contactName || s.phone || ''}</span>
              </p>
            ))
          )}
          {(product.suppliers || []).length ? (
            <form onSubmit={requestSupply} style={{ marginTop: 12 }}>
              <h3>Request supply</h3>
              <Field label="Supplier" required>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  {(product.suppliers || []).map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Message">
                <textarea
                  rows={3}
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder={`Please restock ${product.name}`}
                />
              </Field>
              <button className="btn" type="submit">
                Request supply
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h2>Variants</h2>
          <button className="btn ghost" type="button" onClick={saveThresholds}>
            Save thresholds
          </button>
        </div>
        <DataTable
          rows={product.variants || []}
          searchKeys={['sku', 'size', 'color', 'barcode']}
          searchPlaceholder="SKU, size, colour"
          empty="No variants on this product."
          rowClassName={(v) => (v.stock <= 0 ? 'is-urgent' : v.low ? 'is-pending' : '')}
          columns={[
            { id: 'size', header: 'Size', accessor: (v) => v.size || 'OS' },
            { id: 'color', header: 'Colour', accessor: (v) => v.color || '—' },
            { id: 'sku', header: 'SKU', accessor: (v) => v.sku },
            {
              id: 'stock',
              header: 'Stock',
              accessor: (v) => v.stock,
              cell: (v) => (
                <>
                  {v.stock}
                  {v.low ? <span className="badge low">low</span> : null}
                </>
              )
            },
            {
              id: 'lowStockThreshold',
              header: 'Low-stock threshold',
              sortable: false,
              cell: (v) => (
                <input
                  type="number"
                  min="0"
                  value={thresholds[v._id] ?? v.lowStockThreshold ?? 5}
                  onChange={(e) => setThresholds((cur) => ({ ...cur, [v._id]: e.target.value }))}
                  style={{ width: 88 }}
                />
              )
            },
            { id: 'costPrice', header: 'Cost', accessor: (v) => v.costPrice || 0, cell: (v) => money(v.costPrice) },
            { id: 'price', header: 'Selling price', accessor: (v) => v.price || 0, cell: (v) => money(v.price) }
          ]}
        />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Stock movement</h2>
        <DataTable
          rows={movements}
          searchKeys={['type', 'sku', 'note', 'reason']}
          searchPlaceholder="Type, SKU, or reason"
          empty="No stock movements recorded yet."
          columns={[
            {
              id: 'createdAt',
              header: 'When',
              accessor: (m) => m.createdAt,
              cell: (m) => new Date(m.createdAt).toLocaleString()
            },
            {
              id: 'type',
              header: 'Type',
              accessor: (m) => m.type,
              cell: (m) => TYPE_LABEL[m.type] || m.type
            },
            {
              id: 'reason',
              header: 'Reason',
              accessor: (m) => m.reason || m.note,
              cell: (m) =>
                STOCK_ADJUST_REASONS.find((r) => r.id === m.reason)?.label || m.note || '—'
            },
            { id: 'sku', header: 'SKU', accessor: (m) => m.sku || '—' },
            {
              id: 'qty',
              header: 'Qty',
              accessor: (m) => m.qty,
              cell: (m) => (
                <span className={m.qty < 0 ? 'qty-down' : 'qty-up'}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
              )
            },
            { id: 'user', header: 'By', accessor: (m) => m.user?.name || m.order?.orderNumber || 'System' },
            { id: 'note', header: 'Note', accessor: (m) => m.note || '' }
          ]}
        />
      </div>
      {adjustOpen ? (
        <AdjustStockModal
          productId={product._id}
          onClose={() => {
            setAdjustOpen(false);
            if (params.get('adjust')) {
              const next = new URLSearchParams(params);
              next.delete('adjust');
              setParams(next, { replace: true });
            }
          }}
          onSaved={load}
        />
      ) : null}
    </>
  );
}
