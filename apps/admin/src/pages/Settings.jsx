import { useEffect, useState } from 'react';
import { PasswordInput } from '@khalyx/ui';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useAdminAuth } from '../store/authStore.js';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'store', label: 'Store' },
  { id: 'shipping', label: 'Shipping & POS' },
  { id: 'auth', label: 'Auth & Google' },
  { id: 'payments', label: 'Payments' },
  { id: 'notifications', label: 'Email & WhatsApp' }
];

const blankBulk = { enabled: true, scope: 'same_product', threshold: 3, percent: 5 };
const blankStore = {
  storeName: 'Khalyx Empire',
  tagline: 'From the Ground, To the Throne',
  supportEmail: '',
  supportPhone: '',
  address: '',
  currency: 'NGN',
  shippingFee: 2500,
  freeShippingThreshold: 150000,
  whatsappNumber: '',
  whatsappGroup: '',
  taxNote: ''
};

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="settings-copy-row">
      <div>
        <span className="field-label">{label}</span>
        <code className="settings-code">{value}</code>
      </div>
      <button
        className="btn small ghost"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function Settings() {
  const role = useAdminAuth((s) => s.user?.role);
  const user = useAdminAuth((s) => s.user);
  const hydrate = useAdminAuth((s) => s.hydrate);
  const [tab, setTab] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((t) => t.id === q) ? q : 'profile';
  });
  const [bulk, setBulk] = useState(blankBulk);
  const [store, setStore] = useState(blankStore);
  const [integrations, setIntegrations] = useState(null);
  const [profile, setProfile] = useState({ name: '', phone: '', avatar: '', currentPassword: '', password: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectTab = (id) => {
    setTab(id);
    setMessage('');
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  };

  const loadSettings = () =>
    api.get('/admin/settings').then(({ data }) => {
      setBulk({ ...blankBulk, ...data.posBulk });
      setStore({ ...blankStore, ...data.store });
      setIntegrations(data.integrations || null);
    });

  useEffect(() => {
    loadSettings().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfile((p) => ({
      ...p,
      name: user.name || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    }));
  }, [user]);

  if (role && role !== 'admin') {
    return <p className="alert">Only admins can change system settings. Ask an owner for access.</p>;
  }

  const saveStore = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/settings', { posBulk: bulk, store });
      setBulk({ ...blankBulk, ...data.posBulk });
      setStore({ ...blankStore, ...data.store });
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (profile.password && profile.password !== profile.confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        avatar: profile.avatar
      };
      if (profile.password) {
        payload.password = profile.password;
        payload.currentPassword = profile.currentPassword;
      }
      await api.patch('/auth/me', payload);
      await hydrate();
      setProfile((p) => ({ ...p, currentPassword: '', password: '', confirm: '' }));
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setBusy(false);
    }
  };

  const auth0 = integrations?.auth0;

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="tabs settings-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="alert">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}

      {tab === 'profile' ? (
        <form className="panel form-grid" style={{ maxWidth: 560 }} onSubmit={saveProfile}>
          <h3>Your admin profile</h3>
          <p className="muted">Signed in as {user?.email}. Changes apply to your staff account.</p>
          <Field label="Full name" required>
            <input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input value={user?.email || ''} disabled />
          </Field>
          <Field label="Phone">
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Avatar URL">
            <input value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} />
          </Field>
          <h3 style={{ marginTop: 8 }}>Change password</h3>
          {user?.hasPassword ? (
            <Field label="Current password">
              <PasswordInput
                autoComplete="current-password"
                value={profile.currentPassword}
                onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
              />
            </Field>
          ) : (
            <p className="muted">No local password yet — set one below for email sign-in.</p>
          )}
          <Field label="New password">
            <PasswordInput
              minLength={8}
              autoComplete="new-password"
              value={profile.password}
              onChange={(e) => setProfile({ ...profile, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              minLength={8}
              autoComplete="new-password"
              value={profile.confirm}
              onChange={(e) => setProfile({ ...profile, confirm: e.target.value })}
            />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      ) : null}

      {tab === 'store' ? (
        <form className="panel form-grid" style={{ maxWidth: 640 }} onSubmit={saveStore}>
          <h3>Store profile</h3>
          <p className="muted">Brand details used on invoices and customer communications.</p>
          <Field label="Store name">
            <input value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <input value={store.tagline} onChange={(e) => setStore({ ...store, tagline: e.target.value })} />
          </Field>
          <Field label="Support email">
            <input type="email" value={store.supportEmail} onChange={(e) => setStore({ ...store, supportEmail: e.target.value })} />
          </Field>
          <Field label="Support phone">
            <input value={store.supportPhone} onChange={(e) => setStore({ ...store, supportPhone: e.target.value })} />
          </Field>
          <Field label="Address">
            <textarea rows={2} value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} />
          </Field>
          <Field label="Currency">
            <input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} />
          </Field>
          <Field label="Tax / invoice note">
            <textarea rows={2} value={store.taxNote} onChange={(e) => setStore({ ...store, taxNote: e.target.value })} />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save store profile'}
          </button>
        </form>
      ) : null}

      {tab === 'shipping' ? (
        <form className="panel form-grid" style={{ maxWidth: 640 }} onSubmit={saveStore}>
          <h3>Shipping</h3>
          <Field label="Flat shipping fee (NGN)">
            <input
              type="number"
              min="0"
              value={store.shippingFee}
              onChange={(e) => setStore({ ...store, shippingFee: Number(e.target.value) })}
            />
          </Field>
          <Field label="Free shipping from (NGN)">
            <input
              type="number"
              min="0"
              value={store.freeShippingThreshold}
              onChange={(e) => setStore({ ...store, freeShippingThreshold: Number(e.target.value) })}
            />
          </Field>

          <h3 style={{ marginTop: 12 }}>POS bulk discount</h3>
          <p className="muted">Registers apply this percentage live in the cart and on the receipt.</p>
          <label className="check">
            <input type="checkbox" checked={bulk.enabled} onChange={(e) => setBulk({ ...bulk, enabled: e.target.checked })} />{' '}
            Enable automatic bulk discount
          </label>
          <Field label="Apply when">
            <select value={bulk.scope} onChange={(e) => setBulk({ ...bulk, scope: e.target.value })}>
              <option value="same_product">{bulk.threshold}+ units of the same product</option>
              <option value="cart">{bulk.threshold}+ items anywhere in the cart</option>
            </select>
          </Field>
          <Field label="Quantity threshold">
            <input
              type="number"
              min="1"
              value={bulk.threshold}
              onChange={(e) => setBulk({ ...bulk, threshold: Number(e.target.value) })}
            />
          </Field>
          <Field label="Discount percent">
            <input
              type="number"
              min="0"
              max="90"
              value={bulk.percent}
              onChange={(e) => setBulk({ ...bulk, percent: Number(e.target.value) })}
            />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save shipping & POS'}
          </button>
        </form>
      ) : null}

      {tab === 'auth' ? (
        <div className="panel" style={{ maxWidth: 720 }}>
          <h3>Auth0 / Google sign-in</h3>
          <p>
            Status{' '}
            <span className={`badge ${auth0?.enabled ? 'approved' : 'draft'}`}>
              {auth0?.enabled ? 'Configured on API' : 'Not configured'}
            </span>
          </p>
          <p className="muted">
            The callback URL must be your <strong>API</strong> host (Render/VPS), never the Vercel storefront. Vercel cannot run
            the Auth0 code exchange.
          </p>
          {auth0?.dashboardHint ? <p className="alert" style={{ background: 'transparent' }}>{auth0.dashboardHint}</p> : null}

          <CopyRow label="Allowed Callback URL (paste into Auth0)" value={auth0?.callbackUrl} />
          <CopyRow label="Allowed Logout URLs" value={(auth0?.allowedLogoutUrls || []).join(', ')} />
          <CopyRow label="Allowed Web Origins" value={(auth0?.allowedWebOrigins || []).join(', ')} />
          <CopyRow label="Application Login URI" value={auth0?.applicationLoginUri} />
          <CopyRow label="API public URL" value={auth0?.apiPublicUrl} />
          <CopyRow label="Storefront CLIENT_URL" value={auth0?.clientUrl} />
          <CopyRow label="Auth0 domain" value={auth0?.domain} />

          <ol className="muted" style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Auth0 → Applications → your app → Settings</li>
            <li>Paste the Callback URL above into <strong>Allowed Callback URLs</strong> (comma-separate local + production if both)</li>
            <li>Paste Logout URLs and Web Origins for each storefront origin you use</li>
            <li>Authentication → Social → Google → enable</li>
            <li>
              On Render set <code>AUTH0_CALLBACK_URL</code> to the production callback and <code>CLIENT_URL</code> to the Vercel
              storefront, then redeploy the API
            </li>
            <li>On Vercel set <code>VITE_API_URL</code> to the same API origin and redeploy the storefront</li>
          </ol>
          <p className="muted" style={{ marginTop: 12 }}>
            Local example callback: <code>http://localhost:5000/api/auth/auth0/callback</code>
          </p>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="panel" style={{ maxWidth: 640 }}>
          <h3>Payments</h3>
          {!integrations ? <p className="muted">Loading…</p> : null}
          {integrations ? (
            <>
              <p>
                <strong>Mode</strong>{' '}
                <span className={`badge ${integrations.payments?.mode === 'configured' ? 'approved' : 'draft'}`}>
                  {integrations.payments?.mode === 'configured' ? 'Live keys loaded' : 'Test payment only'}
                </span>
              </p>
              <p className="muted">
                Providers: {(integrations.payments?.details || []).map((d) => d.label).join(', ') || 'Test payment'}
              </p>
              <p className="muted">
                Set PAYSTACK_* and/or FLUTTERWAVE_* on the API host. Restart after changing keys.
              </p>
              {integrations.webhooks?.urls ? (
                <>
                  <h3 style={{ marginTop: 16 }}>Webhook URLs</h3>
                  <CopyRow label="Paystack" value={integrations.webhooks.urls.paystack} />
                  <CopyRow label="Flutterwave" value={integrations.webhooks.urls.flutterwave} />
                  <p className="muted">
                    Flutterwave secret hash:{' '}
                    {integrations.webhooks.flutterwave?.hashConfigured ? (
                      <span className="badge approved">set</span>
                    ) : (
                      <span className="badge draft">set FLUTTERWAVE_WEBHOOK_HASH</span>
                    )}
                  </p>
                </>
              ) : null}
              {integrations.urls ? (
                <>
                  <h3 style={{ marginTop: 16 }}>App URLs (API env)</h3>
                  <CopyRow label="Storefront" value={integrations.urls.clientUrl} />
                  <CopyRow label="Admin" value={integrations.urls.adminUrl} />
                  <CopyRow label="ERP" value={integrations.urls.erpUrl} />
                  <CopyRow label="API" value={integrations.urls.apiPublicUrl} />
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <form className="panel form-grid" style={{ maxWidth: 640 }} onSubmit={saveStore}>
          <h3>Email (SMTP)</h3>
          <p>
            Status{' '}
            <span className={`badge ${integrations?.smtp?.configured ? 'approved' : 'draft'}`}>
              {integrations?.smtp?.configured ? 'Configured' : 'Not configured'}
            </span>
          </p>
          {integrations?.smtp?.configured ? (
            <p className="muted">
              Host {integrations.smtp.host} · From {integrations.smtp.from}
            </p>
          ) : (
            <p className="muted">Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM on the API host.</p>
          )}

          <h3 style={{ marginTop: 12 }}>WhatsApp</h3>
          <Field label="Business number" hint="Digits only, international">
            <input
              value={store.whatsappNumber}
              onChange={(e) => setStore({ ...store, whatsappNumber: e.target.value })}
            />
          </Field>
          <Field label="Group URL">
            <input value={store.whatsappGroup} onChange={(e) => setStore({ ...store, whatsappGroup: e.target.value })} />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save WhatsApp'}
          </button>
        </form>
      ) : null}
    </>
  );
}
