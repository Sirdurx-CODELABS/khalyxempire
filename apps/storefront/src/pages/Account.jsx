import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore.js';
import Seo from '../components/Seo.jsx';

export default function Account() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  if (!ready) return <div className="section container">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="section">
      <Seo title="Account" path="/account" />
      <div className="container">
        <p className="eyebrow">Account</p>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
        <div className="account-nav">
          <Link to="/account">Orders</Link>
          <Link to="/account/profile">Profile</Link>
          <Link to="/account/addresses">Addresses</Link>
          <Link to="/account/wishlist">Wishlist</Link>
          <button
            className="icon-btn"
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
