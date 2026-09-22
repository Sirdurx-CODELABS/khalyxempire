import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api, money, downloadFile } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [channel, setChannel] = useState('');
  const [data, setData] = useState({ rows: [], summary: { revenue: 0, units: 0, orders: 0 } });

  const load = async () => {
    const { data: res } = await api.get('/erp/reports/sales', { params: { from, to, channel: channel || undefined } });
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Sales reports</h1>
        <div>
          <button className="btn" type="button" onClick={load}>
            Refresh
          </button>{' '}
          <button
            className="btn ghost"
            type="button"
            onClick={() =>
              downloadFile('/erp/reports/sales', 'erp-sales.csv', { from, to, channel: channel || undefined, format: 'csv' })
            }
          >
            Export CSV
          </button>{' '}
          <button
            className="btn ghost"
            type="button"
            onClick={() =>
              downloadFile('/erp/reports/sales', 'erp-sales.xls', {
                from,
                to,
                channel: channel || undefined,
                format: 'excel'
              })
            }
          >
            Export Excel
          </button>{' '}
          <button className="btn ghost" type="button" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>
      <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All</option>
            <option value="pos">POS</option>
            <option value="online">Online</option>
          </select>
        </Field>
        <button className="btn" type="button" onClick={load}>
          Apply
        </button>
      </div>
      <section className="stats">
        <article className="stat">
          <span>Revenue</span>
          <strong>{money(data.summary?.revenue)}</strong>
        </article>
        <article className="stat">
          <span>Orders</span>
          <strong>{data.summary?.orders || 0}</strong>
        </article>
        <article className="stat">
          <span>Units</span>
          <strong>{data.summary?.units || 0}</strong>
        </article>
      </section>
      <DataTable
        rows={data.rows || []}
        searchKeys={['orderNumber', 'name', 'sku']}
        empty="No sales in this range."
        columns={[
          { id: 'date', header: 'Date', accessor: (r) => r.date },
          { id: 'order', header: 'Order', accessor: (r) => r.orderNumber },
          { id: 'channel', header: 'Channel', accessor: (r) => r.channel },
          { id: 'name', header: 'Item', accessor: (r) => r.name },
          { id: 'qty', header: 'Qty', accessor: (r) => r.qty },
          {
            id: 'total',
            header: 'Line',
            accessor: (r) => r.lineTotal,
            cell: (r) => money(r.lineTotal)
          }
        ]}
      />
    </>
  );
}
