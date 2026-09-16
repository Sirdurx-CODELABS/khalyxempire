import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/admin/customers/${id}`).then(({ data: d }) => setData(d));
  }, [id]);

  if (!data) return <p>Loading customer…</p>;

  return (
    <>
      <div className="page-head">
        <h1>{data.customer.name}</h1>
      </div>
      <p className="muted">
        {data.customer.email} · {data.customer.phone}
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
              </td>
              <td>{o.status}</td>
              <td>{money(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
