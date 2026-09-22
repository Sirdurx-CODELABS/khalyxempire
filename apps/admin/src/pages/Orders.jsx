import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useLive } from '../hooks/useLive.js';

export default function Orders() {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState({ orders: [], statuses: [] });

  const load = () => api.get('/admin/orders', { params: { status, q, channel, from, to } }).then(({ data: d }) => setData(d));

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [status, channel, from, to, q]);

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
      </div>
      <div className="toolbar">
        <Field label="Search orders">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All channels</option>
            <option value="online">Online</option>
            <option value="pos">In-store</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
      <DataTable
        rows={data.orders}
        rowKey={(o) => o.id || o.orderNumber}
        searchKeys={['orderNumber', 'guestName', 'guestEmail']}
        searchPlaceholder="Order number or customer"
        columns={[
          {
            id: 'orderNumber',
            header: 'Order',
            accessor: (o) => o.orderNumber,
            cell: (o) => <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
          },
          {
            id: 'guestName',
            header: 'Customer',
            accessor: (o) => o.guestName,
            cell: (o) => (
              <>
                {o.guestName}
                <div className="muted">{o.guestEmail}</div>
              </>
            )
          },
          {
            id: 'status',
            header: 'Status',
            accessor: (o) => o.status,
            cell: (o) => <span className={`badge ${o.status}`}>{o.status}</span>
          },
          { id: 'channel', header: 'Channel', accessor: (o) => o.channel },
          { id: 'pay', header: 'Pay', accessor: (o) => o.payment?.provider || '', sortable: false },
          { id: 'total', header: 'Total', accessor: (o) => o.total, cell: (o) => money(o.total) },
          {
            id: 'createdAt',
            header: 'Date',
            accessor: (o) => o.createdAt,
            cell: (o) => new Date(o.createdAt).toLocaleString()
          }
        ]}
      />
    </>
  );
}
