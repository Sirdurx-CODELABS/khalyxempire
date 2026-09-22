import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, siblingApp } from '@khalyx/ui';
import { useAdminAuth } from '../store/authStore.js';
import { api } from '../api/client.js';
import { useLive } from '../hooks/useLive.js';

function groups(can, user, alerts) {
  const unread = alerts.unreadRequests || 0;
  const pending = alerts.pendingRequests || 0;
  const items = [
    {
      label: 'Insights',
      items: [
        can('dashboard') ? { to: '/', label: 'Overview', icon: 'home', end: true } : null,
        can('reports') ? { to: '/reports', label: 'Reports', icon: 'chart' } : null
      ]
    },
    {
      label: 'Catalog',
      items: [
        can('products') ? { to: '/products', label: 'Products', icon: 'bag' } : null,
        can('inventory')
          ? {
              to: '/inventory',
              label: 'Inventory',
              icon: 'box',
              badge: alerts.lowStockCount || 0,
              badgeTone: alerts.lowStockCount ? 'warn' : ''
            }
          : null,
        can('inventory') ? { to: '/labels', label: 'Barcode labels', icon: 'barcode' } : null,
        can('coupons') ? { to: '/coupons', label: 'Coupons', icon: 'ticket' } : null
      ]
    },
    {
      label: 'Sales',
      items: [can('orders') ? { to: '/orders', label: 'Orders', icon: 'clipboard' } : null]
    },
    {
      label: 'People',
      items: [
        can('customers') ? { to: '/customers', label: 'Customers', icon: 'users' } : null,
        can('staff') ? { to: '/staff', label: 'Staff', icon: 'people' } : null,
        can('inventory')
          ? {
              to: '/suppliers',
              label: 'Suppliers',
              icon: 'truck',
              badge: unread || pending || alerts.pendingSuppliers || 0,
              badgeTone: unread ? 'danger' : pending || alerts.pendingSuppliers ? 'warn' : ''
            }
          : null
      ]
    },
    {
      label: 'System',
      items: [user?.role === 'admin' && can('staff') ? { to: '/settings', label: 'Settings', icon: 'cog' } : null]
    }
  ];
  return items
    .map((g) => ({ ...g, items: g.items.filter(Boolean) }))
    .filter((g) => g.items.length);
}

export default function Layout() {
  const user = useAdminAuth((s) => s.user);
  const can = useAdminAuth((s) => s.can);
  const logout = useAdminAuth((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts, setAlerts] = useState({ pendingSuppliers: 0, pendingRequests: 0, unreadRequests: 0, items: [], unread: 0 });
  const [toasts, setToasts] = useState([]);
  const [results, setResults] = useState([]);
  const seen = useRef(new Set());
  const primed = useRef(false);

  useLive(() => {
    api
      .get('/admin/notifications')
      .then(({ data }) => {
        const next = data.items || [];
        if (primed.current) {
          next
            .filter((n) => n.type === 'supply_request' && n.unread && !seen.current.has(n.id))
            .forEach((n) => {
              const toast = { id: `${n.id}-${Date.now()}`, title: n.title, body: n.body };
              setToasts((list) => [...list.slice(-2), toast]);
              setTimeout(() => setToasts((list) => list.filter((t) => t.id !== toast.id)), 7000);
            });
        }
        next.forEach((n) => seen.current.add(n.id));
        primed.current = true;
        setAlerts(data);
      })
      .catch(() => {});
  }, 4000);

  useEffect(() => {
    if (location.pathname === '/suppliers' && new URLSearchParams(location.search).get('tab') === 'requests' && (alerts.unreadRequests || 0) > 0) {
      api.post('/admin/notifications/read', { ids: [] }).then(({ data }) => setAlerts(data)).catch(() => {});
    }
  }, [location.pathname, location.search, alerts.unreadRequests]);

  const search = (value) => {
    if (String(value || '').trim().length < 2) {
      setResults([]);
      return;
    }
    api.get('/admin/search', { params: { q: value } }).then(({ data }) => setResults(data.results || [])).catch(() => setResults([]));
  };

  const markOpened = (item) => {
    if (item?.type === 'supply_request') {
      api.post('/admin/notifications/read', { ids: [item.id] }).catch(() => {});
    }
  };

  return (
    <AppShell
      app="admin"
      subtitle="Admin"
      groups={groups(can, user, alerts)}
      user={user}
      roleLabel={user?.staffTitle || user?.role}
      switchLabel="Open ERP"
      switchHref={
        user?.apps?.includes('erp')
          ? import.meta.env.VITE_ERP_URL || siblingApp(5174, 5175, '/erp/')
          : ''
      }
      onLogout={async () => {
        await logout();
        navigate('/login');
      }}
      search={{ results, onChange: search, placeholder: 'Search products, orders, customers' }}
      notifications={{ items: alerts.items, unread: alerts.unread, toasts, onOpen: markOpened }}
    >
      <Outlet />
    </AppShell>
  );
}
