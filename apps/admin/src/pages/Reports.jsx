import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api, money, downloadFile } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [cats, setCats] = useState([]);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [channel, setChannel] = useState('');
  const [category, setCategory] = useState('');
  const [data, setData] = useState({ rows: [], summary: { revenue: 0, units: 0, orders: 0, profit: 0 } });
  const [best, setBest] = useState([]);
  const [staff, setStaff] = useState([]);
  const [valuation, setValuation] = useState(null);

  const load = async () => {
    const sales = await api.get('/admin/reports/sales', { params: { from, to, category, channel } });
    setData(sales.data);
    const b = await api.get('/admin/reports/bestsellers', { params: { from, to, channel } });
    setBest(b.data.rows || []);
    const s = await api.get('/admin/reports/staff', { params: { from, to } });
    setStaff(s.data.rows || []);
    const v = await api.get('/admin/reports/valuation');
    setValuation(v.data.summary);
  };

  useEffect(() => {
    api.get('/categories').then(({ data: d }) => setCats(d.categories));
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Sales reports</h1>
        <div>
          <button
            className="btn"
            type="button"
            onClick={() => downloadFile('/admin/reports/sales', 'khalyx-sales.csv', { from, to, category, channel, format: 'csv' })}
          >
            Export CSV
          </button>{' '}
          <button className="btn ghost" type="button" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>
      <div className="toolbar">
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All channels</option>
            <option value="online">Online</option>
            <option value="pos">In-store</option>
          </select>
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
        <article className="stat">
          <span>Profit</span>
          <strong>{money(data.summary.profit || 0)}</strong>
        </article>
        {valuation ? (
          <article className="stat">
            <span>Inventory at cost</span>
            <strong>{money(valuation.cost)}</strong>
          </article>
        ) : null}
      </section>
      <DataTable
        rows={data.rows.slice(0, 200).map((r, i) => ({ ...r, _rowId: `${r.orderNumber}-${r.sku}-${i}` }))}
        rowKey={(r) => r._rowId}
        searchKeys={['orderNumber', 'name', 'sku']}
        searchPlaceholder="Order, product, SKU"
        columns={[
          { id: 'date', header: 'Date', accessor: (r) => r.date },
          { id: 'orderNumber', header: 'Order', accessor: (r) => r.orderNumber },
          { id: 'name', header: 'Item', accessor: (r) => `${r.name} ${r.size || ''} ${r.color || ''}`.trim() },
          { id: 'qty', header: 'Qty', accessor: (r) => r.qty },
          { id: 'lineTotal', header: 'Line', accessor: (r) => r.lineTotal, cell: (r) => money(r.lineTotal) }
        ]}
      />
      <h2>Best sellers</h2>
      <DataTable
        rows={best}
        rowKey={(r) => r._id?.sku || r._id?.name}
        searchKeys={[{ accessor: (r) => r._id?.name }]}
        columns={[
          { id: 'name', header: 'Product', accessor: (r) => r._id?.name },
          { id: 'units', header: 'Units', accessor: (r) => r.units },
          { id: 'revenue', header: 'Revenue', accessor: (r) => r.revenue, cell: (r) => money(r.revenue) }
        ]}
      />
      <h2>Staff performance</h2>
      <DataTable
        rows={staff}
        rowKey={(r) => r.staffId || r.name}
        searchKeys={['name']}
        columns={[
          { id: 'name', header: 'Staff', accessor: (r) => r.name },
          { id: 'orders', header: 'Orders', accessor: (r) => r.orders },
          { id: 'revenue', header: 'Revenue', accessor: (r) => r.revenue, cell: (r) => money(r.revenue) },
          { id: 'hours', header: 'Hours', accessor: (r) => r.hours }
        ]}
      />
    </>
  );
}
