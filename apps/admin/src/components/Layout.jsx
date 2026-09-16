import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../store/authStore.js';

const LINKS = [
  { to: '/', label: 'Overview', perm: 'dashboard', end: true },
  { to: '/products', label: 'Products', perm: 'products' },
  { to: '/orders', label: 'Orders', perm: 'orders' },
  { to: '/customers', label: 'Customers', perm: 'customers' },
  { to: '/inventory', label: 'Inventory', perm: 'inventory' },
  { to: '/labels', label: 'Barcode labels', perm: 'inventory' },
  { to: '/coupons', label: 'Coupons', perm: 'coupons' },
  { to: '/reports', label: 'Reports', perm: 'reports' },
  { to: '/staff', label: 'Staff', perm: 'staff' }
];

export default function Layout() {
  const user = useAdminAuth((s) => s.user);
  const can = useAdminAuth((s) => s.can);
  const logout = useAdminAuth((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Khalyx
          <small>Admin</small>
        </div>
        {LINKS.filter((l) => can(l.perm)).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <p className="muted" style={{ padding: '0 12px' }}>
          {user?.name}
          <br />
          {user?.role}
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
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
