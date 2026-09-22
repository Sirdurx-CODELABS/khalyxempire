import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataTable, Skeleton } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { useLive } from '../hooks/useLive.js';

function changeCopy(pct) {
  if (pct > 0) return `+${pct}% vs yesterday`;
  if (pct < 0) return `${pct}% vs yesterday`;
  return 'No change vs yesterday';
}

function channelLabel(channel) {
  return channel === 'pos' ? 'In-store' : 'Online';
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState('daily');

  useLive(() => {
    api
      .get('/admin/dashboard')
      .then(({ data: d }) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load live store data.'));
  }, 8000);

  if (!data) {
    if (error) return <p className="alert">{error}</p>;
    return (
      <>
        <div className="page-head">
          <h1>Overview</h1>
        </div>
        <section className="stats dash-metrics">
          {Array.from({ length: 4 }, (_, i) => (
            <article className="stat" key={i}>
              <Skeleton rows={3} />
            </article>
          ))}
        </section>
        <Skeleton rows={8} />
      </>
    );
  }

  const chart = data.charts?.[range] || data.charts?.daily || [];
  const ChartEl = range === 'daily' ? LineChart : BarChart;
  const alerts = data.alerts || [];
  const inventory = data.inventory || {};
  const ordersToday = data.ordersToday || { total: 0, online: 0, pos: 0 };

  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
        <p className="muted">Live snapshot across online and in-store. Figures refresh every few seconds.</p>
      </div>
      {alerts.length ? (
        <section className="dash-alerts">
          {alerts.slice(0, 8).map((a, i) => (
            <Link key={`${a.type}-${a.href}-${i}`} className={`dash-alert ${a.tone || 'warn'}`} to={a.href || '/'}>
              <strong>{a.title}</strong>
              <span>{a.body}</span>
            </Link>
          ))}
        </section>
      ) : null}
      <section className="stats dash-metrics">
        <Link className="stat metric-link" to="/orders">
          <span>Today&apos;s sales</span>
          <strong>{money(data.salesToday?.revenue || 0)}</strong>
          <p className={`change ${(data.salesToday?.changePct || 0) < 0 ? 'down' : 'up'}`}>{changeCopy(data.salesToday?.changePct || 0)}</p>
        </Link>
        <Link className="stat metric-link" to="/reports">
          <span>This week&apos;s revenue</span>
          <strong>{money(data.salesWeek?.revenue || 0)}</strong>
          <p className="muted">{data.salesWeek?.orders || 0} orders</p>
        </Link>
        <Link className="stat metric-link" to="/reports">
          <span>This month&apos;s revenue</span>
          <strong>{money(data.salesMonth?.revenue || 0)}</strong>
          <p className="muted">{data.salesMonth?.orders || 0} orders</p>
        </Link>
        <Link className="stat metric-link" to="/orders">
          <span>Total orders today</span>
          <strong>{ordersToday.total}</strong>
          <p className="muted">
            {ordersToday.online} online · {ordersToday.pos} in-store
          </p>
        </Link>
      </section>
      <div className="dash-grid">
        <div className="panel dash-chart">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <h2>Revenue</h2>
            <div className="chart-toggle">
              {['daily', 'weekly', 'monthly'].map((key) => (
                <button key={key} className={`btn small ${range === key ? '' : 'ghost'}`} type="button" onClick={() => setRange(key)}>
                  {key === 'daily' ? 'Daily' : key === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ChartEl data={chart}>
                <CartesianGrid stroke="#eee6d6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                {range === 'daily' ? (
                  <>
                    <Line type="monotone" dataKey="online" name="Online" stroke="#0d0d0d" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pos" name="In-store" stroke="#d4af37" strokeWidth={2} dot={false} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="online" name="Online" fill="#0d0d0d" />
                    <Bar dataKey="pos" name="In-store" fill="#d4af37" />
                  </>
                )}
              </ChartEl>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <h2>Inventory</h2>
          <Link className="inv-metric" to="/inventory">
            <span>Total products</span>
            <strong>{inventory.productCount || 0}</strong>
          </Link>
          <Link className="inv-metric" to="/inventory">
            <span>Total stock value</span>
            <strong>{money(inventory.stockValue || 0)}</strong>
          </Link>
          <Link className="inv-metric warn" to="/inventory?status=low">
            <span>Low stock items</span>
            <strong>{inventory.lowCount || 0}</strong>
          </Link>
          <Link className="inv-metric danger" to="/inventory?status=out">
            <span>Out of stock</span>
            <strong>{inventory.outCount || 0}</strong>
          </Link>
        </div>
        <div className="panel">
          <h2>Top-selling this week</h2>
          {(data.topProducts || []).length === 0 ? <p className="muted">No sales this week yet.</p> : null}
          {(data.topProducts || []).map((p) => (
            <Link className="top-seller" key={p._id || p.name} to={p._id ? `/inventory/${p._id}` : '/inventory'}>
              {p.image ? <img src={p.image} alt="" /> : <span className="thumb" />}
              <span>
                <strong>{p.name}</strong>
                <em>{p.units} sold · {money(p.revenue)}</em>
              </span>
            </Link>
          ))}
        </div>
        <div className="panel dash-orders">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <h2>Recent orders</h2>
            <Link className="btn ghost small" to="/orders">
              All orders
            </Link>
          </div>
          <DataTable
            rows={data.recentOrders || []}
            rowKey={(o) => o._id || o.orderNumber}
            searchKeys={['orderNumber', 'customer', 'status', 'channel']}
            empty="No paid orders yet."
            defaultPageSize={10}
            columns={[
              {
                id: 'orderNumber',
                header: 'Order',
                accessor: (o) => o.orderNumber,
                cell: (o) => <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
              },
              { id: 'customer', header: 'Customer', accessor: (o) => o.customer },
              { id: 'items', header: 'Items', accessor: (o) => o.items },
              { id: 'total', header: 'Total', accessor: (o) => o.total, cell: (o) => money(o.total) },
              {
                id: 'status',
                header: 'Status',
                accessor: (o) => o.status,
                cell: (o) => <span className={`badge ${o.status}`}>{o.status}</span>
              },
              {
                id: 'channel',
                header: 'Channel',
                accessor: (o) => o.channel,
                cell: (o) => channelLabel(o.channel)
              }
            ]}
          />
        </div>
        <div className="panel">
          <h2>Recent activity</h2>
          {(data.activity || []).length === 0 ? <p className="muted">No recent activity.</p> : null}
          {(data.activity || []).map((a, i) => (
            <Link key={`${a.type}-${i}`} className={`activity-item ${a.pending || a.unread ? 'is-pending' : ''}`} to={a.href || '/'}>
              <strong>{a.text}</strong>
              <small>{a.at ? new Date(a.at).toLocaleString() : ''}</small>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
