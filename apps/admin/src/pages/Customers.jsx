import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money, downloadFile } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Customers() {
  const [q, setQ] = useState('');
  const [data, setData] = useState({ customers: [] });

  const load = () => api.get('/admin/customers', { params: { q } }).then(({ data: d }) => setData(d));

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        <button className="btn ghost" type="button" onClick={() => downloadFile('/admin/customers/export/csv', 'khalyx-customers.csv')}>
          Export CSV
        </button>
      </div>
      <div className="toolbar">
        <Field label="Search customers">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Search
        </button>
      </div>
      <DataTable
        rows={data.customers}
        rowKey={(c) => c.id}
        searchKeys={['name', 'email', 'phone']}
        searchPlaceholder="Name, email, or phone"
        columns={[
          {
            id: 'name',
            header: 'Name',
            accessor: (c) => c.name,
            cell: (c) => <Link to={`/customers/${c.id}`}>{c.name}</Link>
          },
          { id: 'email', header: 'Email', accessor: (c) => c.email },
          { id: 'orderCount', header: 'Orders', accessor: (c) => c.orderCount },
          { id: 'lifetimeValue', header: 'Lifetime', accessor: (c) => c.lifetimeValue, cell: (c) => money(c.lifetimeValue) }
        ]}
      />
    </>
  );
}
