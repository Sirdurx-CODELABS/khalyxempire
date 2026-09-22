import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money, downloadFile } from '../api/client.js';
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
  const [rma, setRma] = useState({ status: 'requested', reason: '', note: '' });

  const load = async () => {
    const { data } = await api.get(`/admin/orders/${orderNumber}`);
    setOrder(data.order);
    if (data.carriers?.length) setCarriers(data.carriers);
    setShip({
      carrier: data.order?.shipping?.carrier || '',
      trackingNumber: data.order?.shipping?.trackingNumber || '',
      trackingUrl: data.order?.shipping?.trackingUrl || ''
    });
    setPackNotes(data.order?.fulfillment?.packingNotes || '');
    setChecked(data.order?.fulfillment?.checkedSkus || []);
    setRma({
      status: data.order?.rma?.status || 'requested',
      reason: data.order?.rma?.reason || '',
      note: data.order?.rma?.note || ''
    });
  };

  useLive(load, 5000);
  useEffect(() => {
    load().catch(() => setError('Could not load order'));
  }, [orderNumber]);

  if (!order) return <p>Loading order…</p>;

  const patch = async (body) => {
    setError('');
    try {
      const { data } = await api.patch(`/admin/orders/${orderNumber}`, body);
      setOrder(data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const toggleSku = (sku) => {
    setChecked((list) => (list.includes(sku) ? list.filter((s) => s !== sku) : [...list, sku]));
  };

  const exportCsv = () => downloadFile(`/admin/orders/${orderNumber}/export`, `${orderNumber}.csv`);

  return (
    <>
      <div className="page-head no-print">
        <h1>Invoice {order.orderNumber}</h1>
        <div>
          <button className="btn ghost" type="button" onClick={() => window.print()}>
            Print invoice / packing slip
          </button>{' '}
          <button className="btn ghost" type="button" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>
      {error ? <p className="alert no-print">{error}</p> : null}

      <div className="panel">
        <p>
          <strong>Khalyx Empire</strong>
        </p>
        <p>
          {order.guestName} · {order.guestEmail} · {order.guestPhone}
        </p>
        <p>
          {order.shippingAddress?.line1}, {order.shippingAddress?.city}, {order.shippingAddress?.state}
        </p>
        <p>
          Status: <span className={`badge ${order.status}`}>{order.status}</span> · Channel {order.channel} ·{' '}
          {order.payment?.provider} {order.soldBy?.name ? `· sold by ${order.soldBy.name}` : ''}
          {order.fulfillment?.packedAt ? ` · Packed ${new Date(order.fulfillment.packedAt).toLocaleString()}` : ''}
          {order.shipping?.trackingNumber ? ` · Track ${order.shipping.trackingNumber}` : ''}
        </p>

        <div className="toolbar no-print">
          {['processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              className="btn small ghost"
              type="button"
              onClick={() =>
                patch(
                  s === 'shipped'
                    ? { status: s, ...ship }
                    : { status: s }
                )
              }
            >
              Mark {s}
            </button>
          ))}
          <button
            className="btn small danger"
            type="button"
            onClick={() => patch({ refund: true, note: 'Admin refund' })}
          >
            Refund
          </button>
        </div>

        <DataTable
          rows={order.items || []}
          rowKey={(i) => i.sku || i.variantId || i.name}
          searchKeys={['name', 'sku', 'size', 'color']}
          columns={[
            {
              id: 'pack',
              header: 'Pack',
              sortable: false,
              cell: (i) => (
                <label className="check no-print">
                  <input type="checkbox" checked={checked.includes(i.sku)} onChange={() => toggleSku(i.sku)} />
                </label>
              )
            },
            { id: 'name', header: 'Item', accessor: (i) => `${i.name} ${i.size || ''} ${i.color || ''}`.trim() },
            { id: 'qty', header: 'Qty', accessor: (i) => i.qty },
            { id: 'price', header: 'Price', accessor: (i) => i.price, cell: (i) => money(i.price) },
            { id: 'total', header: 'Total', accessor: (i) => i.price * i.qty, cell: (i) => money(i.price * i.qty) }
          ]}
        />
        <p>
          Subtotal {money(order.subtotal)}
          {(order.discountBreakdown || []).map((row) => (
            <span key={row.label}>
              {' '}
              · {row.label} -{money(row.amount)}
            </span>
          ))}
          {!(order.discountBreakdown || []).length ? ` · Discount ${money(order.discount)}` : null} · Shipping{' '}
          {money(order.shippingFee)}
        </p>
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
          <h3>Packing</h3>
          <p className="muted">Check off lines, add notes, then mark packed (moves paid → processing).</p>
          <Field label="Packing notes">
            <textarea rows={3} value={packNotes} onChange={(e) => setPackNotes(e.target.value)} />
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
          <h3>Shipping / tracking</h3>
          <Field label="Carrier">
            <select value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })}>
              <option value="">Select carrier</option>
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tracking number">
            <input value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
          </Field>
          <Field label="Tracking URL">
            <input value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost" type="submit">
              Save tracking
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => patch({ status: 'shipped', ...ship })}
            >
              Save & mark shipped
            </button>
          </div>
          {ship.trackingUrl ? (
            <p className="muted">
              <a href={ship.trackingUrl} target="_blank" rel="noreferrer">
                Open tracking link
              </a>
            </p>
          ) : null}
        </form>
      </div>

      <form
        className="panel form-grid no-print"
        style={{ maxWidth: 560, marginTop: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          patch({ rma });
        }}
      >
        <h3>Return / RMA</h3>
        <Field label="Status">
          <select value={rma.status} onChange={(e) => setRma({ ...rma, status: e.target.value })}>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="received">Received</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Reason">
          <input value={rma.reason} onChange={(e) => setRma({ ...rma, reason: e.target.value })} />
        </Field>
        <Field label="Note">
          <textarea rows={2} value={rma.note} onChange={(e) => setRma({ ...rma, note: e.target.value })} />
        </Field>
        <button className="btn" type="submit">
          Save RMA
        </button>
        {order.rma?.status ? (
          <p className="muted">
            Current: {order.rma.status}
            {order.rma.requestedAt ? ` · opened ${new Date(order.rma.requestedAt).toLocaleDateString()}` : ''}
          </p>
        ) : null}
      </form>
    </>
  );
}
