import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';
import { api } from '../api/client.js';
import BrandMark from './BrandMark.jsx';
import { BagIcon, SearchIcon, UserIcon } from './Icons.jsx';
import { WhatsAppIcon, WhatsAppLink, WHATSAPP_GROUP_URL } from './WhatsApp.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const refresh = useCart((s) => s.refresh);
  const itemCount = useCart((s) => s.itemCount);
  const toast = useCart((s) => s.toast);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    hydrate();
    refresh().catch(() => {});
    api.get('/categories').then(({ data }) => setCats(data.categories || [])).catch(() => {});
  }, [hydrate, refresh]);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const close = () => {
      if (window.innerWidth >= 900) {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  const search = (e) => {
    e.preventDefault();
    setOpen(false);
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const searchForm = (
    <form className={`header-search ${searchOpen ? 'open' : ''}`} onSubmit={search}>
      <SearchIcon />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the collection"
        aria-label="Search the collection"
      />
    </form>
  );

  return (
    <>
      <header className="site-header">
        <div className="container header-bar">
          <div className="header-left">
            <button
              className={`icon-btn menu-btn ${open ? 'is-open' : ''}`}
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => {
                setSearchOpen(false);
                setOpen((v) => !v);
              }}
            >
              <span className="burger" />
            </button>
          </div>
          <Link className="logo" to="/" onClick={() => setOpen(false)}>
            <BrandMark size={32} />
          </Link>
          {searchForm}
          <div className="header-actions">
            <button
              className={`icon-btn search-toggle ${searchOpen ? 'on' : ''}`}
              type="button"
              aria-label="Search"
              onClick={() => {
                setOpen(false);
                setSearchOpen((v) => !v);
              }}
            >
              <SearchIcon size={20} />
            </button>
            <a
              className="icon-btn wa-nav"
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join WhatsApp group"
            >
              <WhatsAppIcon size={22} />
            </a>
            <Link className="icon-btn account-link" to={user ? '/account' : '/login'} aria-label={user ? 'Account' : 'Sign in'}>
              <UserIcon />
              <span className="account-text">{user ? 'Account' : 'Sign in'}</span>
            </Link>
            <Link to="/cart" className="icon-btn bag-link" aria-label={`Bag${itemCount ? `, ${itemCount} items` : ''}`}>
              <BagIcon />
              {itemCount > 0 ? <span className="badge">{itemCount}</span> : null}
            </Link>
          </div>
        </div>
        {cats.length ? (
          <div className="header-cats">
            <nav className="container cat-nav" aria-label="Categories">
              <NavLink to="/shop" end>
                All
              </NavLink>
              {cats.map((c) => (
                <NavLink key={c.slug} to={`/shop/${c.slug}`}>
                  {c.name}
                </NavLink>
              ))}
            </nav>
          </div>
        ) : null}
        <nav className={`drawer ${open ? 'open' : ''}`} aria-label="Mobile">
          <form onSubmit={search}>
            <label className="sr-only" htmlFor="drawer-search">
              Search
            </label>
            <input id="drawer-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the collection" />
          </form>
          <WhatsAppLink className="drawer-wa" onClick={() => setOpen(false)} />
          <Link to={user ? '/account' : '/login'}>{user ? 'Account' : 'Sign in'}</Link>
          <Link to="/shop">Shop all</Link>
          {cats.map((c) => (
            <Link key={c.slug} to={`/shop/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
      </header>
      {open ? <button className="drawer-backdrop" type="button" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <BrandMark size={48} />
            <p className="muted">Fashion and lifestyle. Lagos-born, globally worn.</p>
          </div>
          <div>
            <h3>Shop</h3>
            {cats.map((c) => (
              <p key={c.slug}>
                <Link to={`/shop/${c.slug}`}>{c.name}</Link>
              </p>
            ))}
          </div>
          <div>
            <h3>Community</h3>
            <p>Drops, restocks, and fittings first — in the Khalyx Empire group.</p>
            <WhatsAppLink className="btn wa-btn" label="Join the group" />
          </div>
        </div>
      </footer>
      <a className="wa-fab" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon size={26} />
        <span>WhatsApp</span>
      </a>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
