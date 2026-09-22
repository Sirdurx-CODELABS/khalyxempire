import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useAdminAuth } from '../store/authStore.js';

const blank = { enabled: true, scope: 'same_product', threshold: 3, percent: 5 };

export default function Settings() {
  const role = useAdminAuth((s) => s.user?.role);
  const [form, setForm] = useState(blank);
  const [integrations, setIntegrations] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setForm({ ...blank, ...data.posBulk });
      setIntegrations(data.integrations || null);
    });
  }, []);

  if (role && role !== 'admin') return <p className="alert">Only admins can change POS discount rules.</p>;

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await api.patch('/admin/settings', { posBulk: form });
      setForm({ ...blank, ...data.posBulk });
      setMessage('POS discount rules saved. Registers pick this up on the next cart change.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>
      <form className="panel form-grid" style={{ maxWidth: 560 }} onSubmit={save}>
        <h3>POS bulk discount</h3>
        <p className="muted">
          When a ticket qualifies, the register applies this percentage live in the cart and prints it on the receipt.
        </p>
        {error ? <p className="alert">{error}</p> : null}
        {message ? <p className="ok">{message}</p> : null}
        <label className="check">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />{' '}
          Enable automatic bulk discount
        </label>
        <Field label="Apply when">
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            <option value="same_product">{form.threshold}+ units of the same product</option>
            <option value="cart">{form.threshold}+ items anywhere in the cart</option>
          </select>
        </Field>
        <Field label="Quantity threshold">
          <input
            type="number"
            min="1"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
          />
        </Field>
        <Field label="Discount percent">
          <input
            type="number"
            min="0"
            max="90"
            value={form.percent}
            onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })}
          />
        </Field>
        <p className="muted">
          Example: {form.threshold || 3} {form.scope === 'cart' ? 'items in the cart' : 'of the same product'} → {form.percent || 0}% off
          those qualifying lines.
        </p>
        <button className="btn" type="submit">
          Save
        </button>
      </form>

      <div className="panel" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>Storefront integrations</h3>
        <p className="muted">
          Configured from <code>server/.env</code>. Restart the API after changing keys.
        </p>
        {!integrations ? <p className="muted">Loading…</p> : null}
        {integrations ? (
          <>
            <p>
              <strong>Google (Auth0)</strong>{' '}
              <span className={`badge ${integrations.auth0?.enabled ? 'approved' : 'draft'}`}>
                {integrations.auth0?.enabled ? 'Connected' : 'Not configured'}
              </span>
            </p>
            {integrations.auth0?.enabled ? (
              <p className="muted">
                Domain {integrations.auth0.domain} · Callback {integrations.auth0.callbackUrl}
              </p>
            ) : (
              <p className="muted">Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_CALLBACK_URL.</p>
            )}
            <p style={{ marginTop: 12 }}>
              <strong>Payments</strong>{' '}
              <span className={`badge ${integrations.payments?.mode === 'configured' ? 'approved' : 'draft'}`}>
                {integrations.payments?.mode === 'configured' ? 'Live keys loaded' : 'Test payment only'}
              </span>
            </p>
            <p className="muted">
              Providers: {(integrations.payments?.details || []).map((d) => d.label).join(', ') || 'Test payment'}
            </p>
            <p className="muted">
              Add PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY and/or FLUTTERWAVE_SECRET_KEY / FLUTTERWAVE_PUBLIC_KEY.
            </p>
            {integrations.webhooks?.urls ? (
              <>
                <p style={{ marginTop: 12 }}>
                  <strong>Webhook URLs</strong> (paste into each provider dashboard)
                </p>
                <p className="muted">
                  Paystack: <code>{integrations.webhooks.urls.paystack}</code>
                </p>
                <p className="muted">
                  Flutterwave: <code>{integrations.webhooks.urls.flutterwave}</code>
                </p>
                <p className="muted">
                  Flutterwave secret hash:{' '}
                  {integrations.webhooks.flutterwave?.hashConfigured ? (
                    <span className="badge approved">set</span>
                  ) : (
                    <span className="badge draft">set FLUTTERWAVE_WEBHOOK_HASH</span>
                  )}
                </p>
                <p className="muted">
                  For local testing, expose the API with a tunnel (e.g. ngrok) and set API_PUBLIC_URL to that HTTPS origin.
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
