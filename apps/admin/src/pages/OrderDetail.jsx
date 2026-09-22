import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money, downloadFile } from '../api/client.js';

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/admin/orders/${orderNumber}`).then(({ data }) => setOrder(data.order));

  useEffect(() => {
    load();
  }, [orderNumber]);

  if (!order) return <p>Loading order…</p>;

  const update = async (status) => {
    setError('');
    try {
      const { data } = await api.patch(`/admin/orders/${orderNumber}`, { status });
      setOrder(data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    }
  };

  const exportCsv = () => downloadFile(`/admin/orders/${orderNumber}/export`, `${orderNumber}.csv`);

  return (
    <>
      <div className="page-head no-print">
        <h1>Invoice {order.orderNumber}</h1>
        <div>
          <button className="btn ghost" type="button" onClick={() => window.print()}>
            Print invoice
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
        </p>
        <div className="toolbar no-print">
          {['processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
            <button key={s} className="btn small ghost" type="button" onClick={() => update(s)}>
              Mark {s}
            </button>
          ))}
          <button
            className="btn small danger"
            type="button"
            onClick={() =>
              api.patch(`/admin/orders/${orderNumber}`, { refund: true, note: 'Admin refund' }).then(({ data }) => setOrder(data.order))
            }
          >
            Refund
          </button>
        </div>
        <DataTable
          rows={order.items || []}
          rowKey={(i) => i.sku || i.variantId || i.name}
          searchKeys={['name', 'sku', 'size', 'color']}
          columns={[
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
          {!(order.discountBreakdown || []).length ? ` · Discount ${money(order.discount)}` : null} · Shipping {money(order.shippingFee)}
        </p>
        <h2>Total {money(order.total)}</h2>
      </div>
    </>
  );
}
