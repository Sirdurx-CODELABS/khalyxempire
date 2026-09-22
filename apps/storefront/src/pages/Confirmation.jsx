import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { money } from '../lib/money.js';
import Seo from '../components/Seo.jsx';
import { WHATSAPP_GROUP_URL } from '../components/WhatsApp.jsx';

export default function Confirmation() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const email = params.get('email') || sessionStorage.getItem('khalyx_order_email') || '';
    const run = async () => {
      try {
        if (params.get('paid') && (params.get('reference') || params.get('trxref') || params.get('transaction_id') || params.get('tx_ref'))) {
          await api.get('/payments/verify', {
            params: {
              provider: params.get('provider') || (params.get('transaction_id') ? 'flutterwave' : 'paystack'),
              reference: params.get('reference') || params.get('trxref') || params.get('tx_ref'),
              transaction_id: params.get('transaction_id')
            }
          });
        }
        const { data } = await api.get(`/orders/${orderNumber}`, { params: { email } });
        setOrder(data.order);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this order');
      }
    };
    run();
  }, [orderNumber, params]);

  if (error) {
    return (
      <div className="section container">
        <p className="alert">{error}</p>
      </div>
    );
  }
  if (!order) return <div className="section container">Loading confirmation…</div>;

  return (
    <div className="section">
      <Seo title={`Order ${order.orderNumber}`} path={`/order/${order.orderNumber}`} />
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="eyebrow">Confirmed</p>
        <h1>Thank you, {order.guestName || 'there'}.</h1>
        <p>
          Order <strong>{order.orderNumber}</strong> is {order.status}. A note is ready on email
          {order.guestEmail ? ` (${order.guestEmail})` : ''}.
        </p>
        {order.items.map((i) => (
          <p key={i.sku}>
            {i.qty}× {i.name} — {money(i.price * i.qty)}
          </p>
        ))}
        <p>
          <strong>Total {money(order.total)}</strong>
        </p>
        <div className="hero-actions">
          <a className="btn" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
            Share in WhatsApp group
          </a>
          {order.whatsappLink ? (
            <a className="btn ghost" href={order.whatsappLink} target="_blank" rel="noreferrer">
              Message the store
            </a>
          ) : null}
          <Link className="btn ghost" to="/shop">
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
