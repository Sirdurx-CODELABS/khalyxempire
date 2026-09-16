import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../store/authStore.js';

export default function Guard({ children, permission }) {
  const ready = useAdminAuth((s) => s.ready);
  const user = useAdminAuth((s) => s.user);
  const can = useAdminAuth((s) => s.can);

  if (!ready) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <p className="alert">You do not have access to this section.</p>;
  return children;
}
