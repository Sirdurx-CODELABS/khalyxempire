import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import './shell.css';

function siblingPort(current, target) {
  const { protocol, hostname, port } = window.location;
  if (port === String(current)) return `${protocol}//${hostname}:${target}`;
  return '';
}

export default function AppShell({
  app = 'admin',
  subtitle = 'Admin',
  groups = [],
  user,
  roleLabel,
  switchLabel,
  switchHref,
  onLogout,
  search,
  notifications,
  extraBanner,
  children
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const storageKey = `khalyx-${app}-nav`;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, storageKey]);

  useEffect(() => {
    setMobileOpen(false);
    setBellOpen(false);
    setUserOpen(false);
    setQ('');
  }, [location.pathname, location.search]);

  const crumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const labels = {
      products: 'Products',
      orders: 'Orders',
      customers: 'Customers',
      inventory: 'Inventory',
      suppliers: 'Suppliers',
      labels: 'Barcode labels',
      coupons: 'Coupons',
      reports: 'Reports',
      staff: 'Staff',
      settings: 'Settings',
      new: 'New',
      edit: 'Edit',
      'purchase-orders': 'Purchase orders',
      clock: 'Clock',
      reconciliation: 'Reconcile'
    };
    const list = [{ to: '/', label: subtitle }];
    let href = '';
    parts.forEach((part, i) => {
      href += `/${part}`;
      const pretty = labels[part] || (part.length > 18 ? 'Details' : part);
      list.push({ to: href, label: pretty, current: i === parts.length - 1 });
    });
    if (new URLSearchParams(location.search).get('tab') === 'requests') {
      list.push({ to: `${location.pathname}?tab=requests`, label: 'Supply requests', current: true });
    }
    return list;
  }, [location.pathname, location.search, subtitle]);

  const unread = notifications?.unread || 0;
  const results = search?.results || [];

  const onSearch = (value) => {
    setQ(value);
    search?.onChange?.(value);
  };

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      {mobileOpen ? <button className="app-scrim" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside className="app-nav">
        <div className="app-brand">
          <img src={`${import.meta.env.BASE_URL}brand/logo.png`} alt="" width="36" height="36" />
          {collapsed ? <span className="app-mono">K+E</span> : (
            <span>
              Khalyx Empire
              <small>{subtitle}</small>
            </span>
          )}
        </div>
        {groups.map((group) => (
          <div key={group.label} className="app-nav-group">
            <p className="app-nav-label">{group.label}</p>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `app-link ${isActive ? 'is-active' : ''}`}>
                <Icon name={item.icon} />
                <span className="app-link-text">{item.label}</span>
                {item.badge ? <em className={`app-badge ${item.badgeTone || ''}`}>{item.badge}</em> : null}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="app-nav-foot">
          <div className="app-userchip">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{user?.name?.[0] || 'K'}</span>}
            <div>
              <strong>{user?.name}</strong>
              <small>{roleLabel || user?.staffTitle || user?.role}</small>
            </div>
          </div>
          <button className="app-link" type="button" onClick={onLogout}>
            <Icon name="logout" />
            <span className="app-link-text">Log out</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        {extraBanner}
        <header className="app-top">
          <button className="app-iconbtn app-menu-btn" type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Icon name="menu" />
          </button>
          <button className="app-iconbtn app-collapse-btn" type="button" aria-label="Toggle sidebar" onClick={() => setCollapsed((v) => !v)}>
            <Icon name="chevron" />
          </button>
          <nav className="app-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={`${c.to}-${i}`}>
                {i ? <i>/</i> : null}
                {c.current ? <b>{c.label}</b> : <button type="button" onClick={() => navigate(c.to)}>{c.label}</button>}
              </span>
            ))}
          </nav>
          <div className="app-search">
            <Icon name="search" />
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={search?.placeholder || 'Search products, orders, customers'}
              aria-label="Global search"
            />
            {q && results.length ? (
              <div className="app-pop">
                {results.map((hit) => (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    type="button"
                    onClick={() => {
                      navigate(hit.href);
                      setQ('');
                      search?.onChange?.('');
                    }}
                  >
                    <strong>{hit.title}</strong>
                    <span>{hit.meta || hit.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="app-iconbtn app-bell" type="button" aria-label="Notifications" onClick={() => setBellOpen((v) => !v)}>
            <Icon name="bell" />
            {unread ? <em className="app-badge danger">{unread}</em> : null}
          </button>
          {bellOpen ? (
            <div className="app-pop app-bell-pop">
              <p className="app-pop-title">Notifications</p>
              {(notifications?.items || []).length === 0 ? <p className="muted">No alerts right now.</p> : null}
              {(notifications?.items || []).map((n) => (
                <button
                  key={`${n.type}-${n.id}`}
                  type="button"
                  className={n.unread ? 'is-unread' : ''}
                  onClick={() => {
                    notifications?.onOpen?.(n);
                    navigate(n.href);
                    setBellOpen(false);
                  }}
                >
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </button>
              ))}
            </div>
          ) : null}
          <button className="app-userbtn" type="button" onClick={() => setUserOpen((v) => !v)}>
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{user?.name?.[0] || 'K'}</span>}
          </button>
          {userOpen ? (
            <div className="app-pop app-user-pop">
              <p>
                <strong>{user?.name}</strong>
                <span>{roleLabel || user?.role}</span>
              </p>
              {switchHref ? (
                <a href={switchHref}>{switchLabel || 'Switch system'}</a>
              ) : null}
              <button type="button" onClick={onLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </header>
        <div className="app-stage">{children}</div>
      </div>
      {(notifications?.toasts || []).map((t) => (
        <div key={t.id} className="app-toast danger">
          <strong>{t.title}</strong>
          <span>{t.body}</span>
        </div>
      ))}
    </div>
  );
}

export function siblingApp(fromPort, toPort, path) {
  const base = siblingPort(fromPort, toPort);
  return base ? `${base}${path}` : path;
}
