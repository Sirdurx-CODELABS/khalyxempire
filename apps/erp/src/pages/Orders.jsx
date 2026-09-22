import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useLive } from '../hooks/useLive.js';

export default function Orders() {
  const today = new Date().toISOString().slice(0, 10);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const load = async () => {
    const { data } = await api.get('/erp/orders', {
      params: {
        q: q || undefined,
        status: status || undefined,
        channel: channel || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 80
      }
    });
    setOrders(data.orders || []);
    setStatuses(data.statuses || []);
  };

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [q, status, channel, from, to]);

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
        <p className="muted">POS and online orders — packing and tracking for the floor.</p>
      </div>
      <DataTable
        rows={orders}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Order #, name, phone, tracking"
        empty="No orders in this range."
        filters={
          <>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Channel">
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="">All</option>
                <option value="pos">POS</option>
                <option value="online">Online</option>
              </select>
            </Field>
            <Field label="From">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </>
        }
        columns={[
          {
            id: 'order',
            header: 'Order',
            accessor: (o) => o.orderNumber,
            cell: (o) => <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
          },
          {
            id: 'customer',
            header: 'Customer',
            accessor: (o) => o.guestName || o.guestPhone || ''
          },
          { id: 'channel', header: 'Channel', accessor: (o) => o.channel },
          {
            id: 'status',
            header: 'Status',
            accessor: (o) => o.status,
            cell: (o) => <span className={`badge ${o.status}`}>{o.status}</span>
          },
          {
            id: 'total',
            header: 'Total',
            accessor: (o) => o.total,
            cell: (o) => money(o.total)
          },
          {
            id: 'when',
            header: 'When',
            accessor: (o) => o.createdAt,
            cell: (o) => (o.createdAt ? new Date(o.createdAt).toLocaleString() : '—')
          }
        ]}
      />
    </>
  );
}
