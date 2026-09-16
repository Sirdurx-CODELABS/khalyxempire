import { useEffect, useState } from 'react';
import { api, money, downloadFile } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [cats, setCats] = useState([]);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [category, setCategory] = useState('');
  const [data, setData] = useState({ rows: [], summary: { revenue: 0, units: 0, orders: 0 } });

  const load = () =>
    api.get('/admin/reports/sales', { params: { from, to, category } }).then(({ data: d }) => setData(d));

  useEffect(() => {
    api.get('/categories').then(({ data: d }) => setCats(d.categories));
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Sales reports</h1>
        <button
          className="btn"
          type="button"
          onClick={() => downloadFile('/admin/reports/sales', 'khalyx-sales.csv', { from, to, category, format: 'csv' })}
        >
          Export CSV / Excel
        </button>
      </div>
      <div className="toolbar">
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Run
        </button>
      </div>
      <section className="stats">
        <article className="stat">
          <span>Revenue</span>
          <strong>{money(data.summary.revenue)}</strong>
        </article>
        <article className="stat">
          <span>Orders</span>
          <strong>{data.summary.orders}</strong>
        </article>
        <article className="stat">
          <span>Units</span>
          <strong>{data.summary.units}</strong>
        </article>
      </section>
      <table className="data">
        <thead>
          <tr>
            <th>Date</th>
            <th>Order</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, 100).map((r, i) => (
            <tr key={`${r.orderNumber}-${r.sku}-${i}`}>
              <td>{r.date}</td>
              <td>{r.orderNumber}</td>
              <td>
                {r.name} {r.size} {r.color}
              </td>
              <td>{r.qty}</td>
              <td>{money(r.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
