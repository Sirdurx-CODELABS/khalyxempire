import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, siblingApp } from '@khalyx/ui';
import { useErpAuth } from '../store/authStore.js';
import { useOffline } from '../store/offlineStore.js';
import { api } from '../api/client.js';

const GROUPS = [
  {
    label: 'Sales',
    items: [
      { to: '/', label: 'POS', icon: 'pos', end: true },
      { to: '/orders', label: 'Orders', icon: 'clipboard' }
    ]
  },
  {
    label: 'Catalog',
    items: [
      { to: '/inventory', label: 'Inventory', icon: 'box' },
      { to: '/labels', label: 'Barcode labels', icon: 'barcode' }
    ]
  },
  {
    label: 'People',
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: 'truck' },
      { to: '/purchase-orders', label: 'Purchase orders', icon: 'clipboard' }
    ]
  },
  {
    label: 'Insights',
    items: [
      { to: '/clock', label: 'Clock', icon: 'clock' },
      { to: '/reconciliation', label: 'Reconcile', icon: 'scale' },
      { to: '/reports', label: 'Reports', icon: 'chart' }
    ]
  }
];

export default function Layout() {
  const user = useErpAuth((s) => s.user);
  const logout = useErpAuth((s) => s.logout);
  const navigate = useNavigate();
  const online = useOffline((s) => s.online);
  const queue = useOffline((s) => s.queue);
  const flush = useOffline((s) => s.flush);
  const syncing = useOffline((s) => s.syncing);
  const [results, setResults] = useState([]);

  const search = (value) => {
    if (String(value || '').trim().length < 2) {
      setResults([]);
      return;
    }
    api.get('/erp/search', { params: { q: value } }).then(({ data }) => setResults(data.results || [])).catch(() => setResults([]));
  };

  return (
    <AppShell
      app="erp"
      subtitle="Store ERP"
      groups={GROUPS}
      user={user}
      roleLabel={user?.staffTitle || user?.role}
      switchLabel="Open Admin"
      switchHref={
        user?.apps?.includes('admin')
          ? import.meta.env.VITE_ADMIN_URL || siblingApp(5175, 5174, '/admin/')
          : ''
      }
      onLogout={async () => {
        await logout();
        navigate('/login');
      }}
      search={{ results, onChange: search, placeholder: 'Search products, suppliers, POs' }}
      extraBanner={
        !online || queue.length ? (
          <div className="offline-bar">
            <span>{online ? `${queue.length} sale(s) waiting to sync` : 'Offline — sales will queue until the network returns'}</span>
            <button className="btn" type="button" disabled={!online || syncing} onClick={() => flush()}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        ) : null
      }
    >
      <Outlet />
    </AppShell>
  );
}
