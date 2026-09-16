import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
          {order.payment?.provider}
        </p>
        <div className="toolbar no-print">
          {['processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
            <button key={s} className="btn small ghost" type="button" onClick={() => update(s)}>
              Mark {s}
            </button>
          ))}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.sku}>
                <td>
                  {i.name} {i.size} {i.color}
                </td>
                <td>{i.qty}</td>
                <td>{money(i.price)}</td>
                <td>{money(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Subtotal {money(order.subtotal)} · Discount {money(order.discount)} · Shipping {money(order.shippingFee)}
        </p>
        <h2>Total {money(order.total)}</h2>
      </div>
    </>
  );
}
