import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { money } from '../lib/money.js';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/orders/mine').then(({ data }) => setOrders(data.orders));
  }, []);

  if (!orders.length) return <p className="empty">No orders yet.</p>;

  return (
    <div className="table-wrap">
    <table className="table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Status</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td>{o.orderNumber}</td>
            <td>{o.status}</td>
            <td>{money(o.total)}</td>
            <td>
              <Link to={`/order/${o.orderNumber}?email=${encodeURIComponent(o.guestEmail || '')}`}>View</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
