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
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('token');
    const nextRaw = hash.get('next') || '/account';
    const next = decodeURIComponent(nextRaw);

    if (!token) {
      navigate('/login?error=' + encodeURIComponent('Google sign-in did not finish'), { replace: true });
      return undefined;
    }

    saveToken(token);
    // Drop the token from the address bar so refresh cannot re-process a stale hash.
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

    hydrate()
      .then(() => refresh())
      .then(() => {
        if (cancelled) return;
        const path = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
        navigate(path, { replace: true });
      })
      .catch(() => {
        if (!cancelled) {
          navigate('/login?error=' + encodeURIComponent('Could not load your account after Google sign-in'), {
            replace: true
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, navigate, refresh]);

  return <div className="section container">Signing you in…</div>;
}
