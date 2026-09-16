import { guestId } from '../api/client.js';
import { GoogleIcon } from './Icons.jsx';

export default function GoogleSignIn({ next = '/account', label = 'Continue with Google' }) {
  const start = () => {
    const params = new URLSearchParams({ next, guestId: guestId() });
    window.location.href = `/api/auth/google?${params}`;
  };

  return (
    <button className="btn google-btn full" type="button" onClick={start}>
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}
