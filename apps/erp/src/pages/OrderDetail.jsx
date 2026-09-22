import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useLive } from '../hooks/useLive.js';

const CARRIERS_FALLBACK = ['GIG Logistics', 'DHL', 'FedEx', 'NIPOST', 'Kwik', 'Other'];

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [carriers, setCarriers] = useState(CARRIERS_FALLBACK);
  const [error, setError] = useState('');
  const [ship, setShip] = useState({ carrier: '', trackingNumber: '', trackingUrl: '' });
  const [packNotes, setPackNotes] = useState('');
  const [checked, setChecked] = useState([]);

  const load = async () => {
    const { data } = await api.get(`/erp/orders/${orderNumber}`);
    setOrder(data.order);
    if (data.carriers?.length) setCarriers(data.carriers);
    setShip({
      carrier: data.order?.shipping?.carrier || '',
      trackingNumber: data.order?.shipping?.trackingNumber || '',
      trackingUrl: data.order?.shipping?.trackingUrl || ''
    });
    setPackNotes(data.order?.fulfillment?.packingNotes || '');
    setChecked(data.order?.fulfillment?.checkedSkus || []);
  };

  useLive(load, 5000);
  useEffect(() => {
    load().catch(() => setError('Could not load order'));
  }, [orderNumber]);

  if (!order) return <p>Loading…</p>;

  const patch = async (body) => {
    setError('');
    try {
      const { data } = await api.patch(`/erp/orders/${orderNumber}`, body);
      setOrder(data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/orders" className="muted">
            ← Orders
          </Link>
          <h1>{order.orderNumber}</h1>
        </div>
        <button className="btn ghost" type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <div className="panel">
        <p>
          {order.guestName} · {order.guestPhone} · <span className={`badge ${order.status}`}>{order.status}</span> ·{' '}
          {order.channel}
        </p>
        <div className="toolbar no-print">
          {['processing', 'shipped', 'delivered'].map((s) => (
            <button
              key={s}
              className="btn small ghost"
              type="button"
              onClick={() => patch(s === 'shipped' ? { status: s, ...ship } : { status: s })}
            >
              Mark {s}
            </button>
          ))}
        </div>
        <DataTable
          rows={order.items || []}
          rowKey={(i) => i.sku || i.name}
          columns={[
            {
              id: 'pack',
              header: 'Pack',
              sortable: false,
              cell: (i) => (
                <input
                  type="checkbox"
                  checked={checked.includes(i.sku)}
                  onChange={() =>
                    setChecked((list) => (list.includes(i.sku) ? list.filter((s) => s !== i.sku) : [...list, i.sku]))
                  }
                />
              )
            },
            { id: 'name', header: 'Item', accessor: (i) => `${i.name} ${i.size || ''} ${i.color || ''}`.trim() },
            { id: 'qty', header: 'Qty', accessor: (i) => i.qty },
            { id: 'price', header: 'Price', accessor: (i) => i.price, cell: (i) => money(i.price) }
          ]}
        />
        <h2>Total {money(order.total)}</h2>
      </div>
      <div className="split no-print" style={{ display: 'grid', gap: 16, marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ pack: true, packingNotes: packNotes, checkedSkus: checked });
          }}
        >
          <h3>Pack</h3>
          <Field label="Notes">
            <textarea rows={2} value={packNotes} onChange={(e) => setPackNotes(e.target.value)} />
          </Field>
          <button className="btn" type="submit">
            Mark packed
          </button>
        </form>
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ shipment: ship });
          }}
        >
          <h3>Tracking</h3>
          <Field label="Carrier">
            <select value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })}>
              <option value="">Select</option>
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tracking #">
            <input value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
          </Field>
          <button className="btn" type="button" onClick={() => patch({ status: 'shipped', ...ship })}>
            Ship with tracking
          </button>
        </form>
      </div>
    </>
  );
}
