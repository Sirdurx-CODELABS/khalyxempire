import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, money } from '../api/client.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then(({ data: d }) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load live store data.'));
  }, []);

  if (error) return <p className="alert">{error}</p>;
  if (!data) return <p>Loading live overview…</p>;

  return (
    <>
      <div className="page-head">
        <h1>Store health</h1>
      </div>
      <section className="stats">
        <article className="stat">
          <span>Today</span>
          <strong>{money(data.salesToday.revenue)}</strong>
          <p className="muted">{data.salesToday.orders} orders</p>
        </article>
        <article className="stat">
          <span>7 days</span>
          <strong>{money(data.salesWeek.revenue)}</strong>
          <p className="muted">{data.salesWeek.orders} orders</p>
        </article>
        <article className="stat">
          <span>30 days</span>
          <strong>{money(data.salesMonth.revenue)}</strong>
          <p className="muted">{data.salesMonth.orders} orders</p>
        </article>
        <article className="stat">
          <span>Low stock</span>
          <strong>{data.lowStockCount}</strong>
          <p className="muted">
            <Link to="/inventory">Review inventory</Link>
          </p>
        </article>
      </section>
      <div className="split wide" style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          <h2>Revenue</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <CartesianGrid stroke="#eee6d6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <h2>Low stock</h2>
          {data.lowStock.length === 0 ? <p className="muted">All variants are healthy.</p> : null}
          {data.lowStock.slice(0, 8).map((row) => (
            <p key={row.variantId}>
              {row.name} · {row.size} {row.color}{' '}
              <span className="badge low">{row.stock} left</span>
            </p>
          ))}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Recent orders</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o._id || o.orderNumber}>
                <td>
                  <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
                </td>
                <td>
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </td>
                <td>{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
