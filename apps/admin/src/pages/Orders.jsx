import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Orders() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState({ orders: [], statuses: [] });

  const load = () => api.get('/admin/orders', { params: { status, q } }).then(({ data: d }) => setData(d));

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
      </div>
      <div className="toolbar">
        <Field label="Search orders">
          <input placeholder="Order number, email, or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(data.statuses || ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Filter
        </button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
              </td>
              <td>
                {o.guestName}
                <div className="muted">{o.guestEmail}</div>
              </td>
              <td>
                <span className={`badge ${o.status}`}>{o.status}</span>
              </td>
              <td>{money(o.total)}</td>
              <td>{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
