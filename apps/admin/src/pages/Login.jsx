import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthButton, AuthError, AuthField, AuthShell, PasswordInput, rememberEmail, rememberedEmail } from '@khalyx/auth-ui';
import { useAdminAuth } from '../store/authStore.js';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export default function Login() {
  const login = useAdminAuth((s) => s.login);
  const user = useAdminAuth((s) => s.user);
  const ready = useAdminAuth((s) => s.ready);
  const navigate = useNavigate();
  const remembered = rememberedEmail('admin');
  const [form, setForm] = useState({ email: remembered, password: '', remember: Boolean(remembered) });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      rememberEmail('admin', form.email, form.remember);
      await login({ email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Wrong email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell badge="Admin Portal" logoSrc={logoSrc}>
      <h1>Welcome back</h1>
      <p className="auth-lead">Sign in to the Khalyx Empire command centre.</p>
      <form className="auth-form" onSubmit={submit}>
        <AuthError>{error}</AuthError>
        <AuthField label="Email">
          <input
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </AuthField>
        <AuthField label="Password">
          <PasswordInput
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </AuthField>
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
            />
            Remember me
          </label>
          <Link className="auth-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <AuthButton loading={loading}>Sign in</AuthButton>
      </form>
    </AuthShell>
  );
}
