import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveToken } from '../api/client.js';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';

export default function AuthCallback() {
  const navigate = useNavigate();
  const hydrate = useAuth((s) => s.hydrate);
  const refresh = useCart((s) => s.refresh);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('token');
    const next = hash.get('next') || '/account';
    if (!token) {
      navigate('/login?error=' + encodeURIComponent('Google sign-in did not finish'), { replace: true });
      return;
    }
    saveToken(token);
    hydrate()
      .then(() => refresh())
      .finally(() => {
        const path = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
        navigate(path, { replace: true });
      });
  }, [hydrate, navigate, refresh]);

  return <div className="section container">Signing you in…</div>;
}
