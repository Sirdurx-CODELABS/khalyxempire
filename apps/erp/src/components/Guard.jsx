import { Navigate } from 'react-router-dom';
import { useErpAuth } from '../store/authStore.js';

export default function Guard({ children }) {
  const ready = useErpAuth((s) => s.ready);
  const user = useErpAuth((s) => s.user);
  if (!ready) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
