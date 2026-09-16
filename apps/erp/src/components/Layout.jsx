import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useErpAuth } from '../store/authStore.js';
import { useOffline } from '../store/offlineStore.js';

const LINKS = [
  { to: '/', label: 'POS', end: true },
  { to: '/purchase-orders', label: 'Purchase orders' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/clock', label: 'Clock' },
  { to: '/reconciliation', label: 'Reconcile' },
  { to: '/labels', label: 'Labels' }
];

export default function Layout() {
  const user = useErpAuth((s) => s.user);
  const logout = useErpAuth((s) => s.logout);
  const navigate = useNavigate();
  const online = useOffline((s) => s.online);
  const queue = useOffline((s) => s.queue);
  const flush = useOffline((s) => s.flush);
  const syncing = useOffline((s) => s.syncing);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Khalyx
          <small>Store ERP</small>
        </div>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <p className="muted" style={{ padding: '0 12px' }}>
          {user?.name}
        </p>
        <button
          className="linkish"
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Sign out
        </button>
      </aside>
      <div>
        {!online || queue.length ? (
          <div className="offline-bar">
            <span>
              {online ? `${queue.length} sale(s) waiting to sync` : 'Offline — sales will queue until the network returns'}
            </span>
            <button className="btn" type="button" disabled={!online || syncing} onClick={() => flush()}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        ) : null}
        <div className="main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
