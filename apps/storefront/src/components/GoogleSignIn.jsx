import { useEffect, useState } from 'react';
import { GoogleIcon } from './Icons.jsx';
import { api, guestId } from '../api/client.js';

export default function GoogleSignIn({ next = '/account', label = 'Continue with Google' }) {
  const [google, setGoogle] = useState(null);
  const [hint, setHint] = useState('');

  useEffect(() => {
    api
      .get('/auth/methods')
      .then(({ data }) => {
        setGoogle(Boolean(data.google));
        setHint(data.hint || '');
      })
      .catch(() => {
        setGoogle(false);
        setHint('Could not reach the API to check Google sign-in.');
      });
  }, []);

  const start = () => {
    if (!google) return;
    const params = new URLSearchParams({ next, guestId: guestId() });
    window.location.href = `/api/auth/google?${params}`;
  };

  if (google === null) {
    return (
      <button className="btn google-btn full" type="button" disabled>
        <GoogleIcon />
        <span>Checking Google…</span>
      </button>
    );
  }

  if (!google) {
    return (
      <div className="google-disabled">
        <button className="btn google-btn full" type="button" disabled title={hint}>
          <GoogleIcon />
          <span>Google sign-in unavailable</span>
        </button>
        <p className="muted google-hint">
          {hint ||
            'Add AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET to server/.env, enable the Google connection in Auth0, then restart the API.'}
        </p>
      </div>
    );
  }

  return (
    <button className="btn google-btn full" type="button" onClick={start}>
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}
