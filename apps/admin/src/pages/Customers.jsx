import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';
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
      </div>
      <div className="toolbar">
        <Field label="Search customers">
          <input placeholder="Name, email, or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Search
        </button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Orders</th>
            <th>Lifetime</th>
          </tr>
        </thead>
        <tbody>
          {data.customers.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/customers/${c.id}`}>{c.name}</Link>
              </td>
              <td>{c.email}</td>
              <td>{c.orderCount}</td>
              <td>{money(c.lifetimeValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
