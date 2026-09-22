import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthButton, AuthError, AuthField, AuthShell, rememberEmail, rememberedEmail } from '@khalyx/auth-ui';
import { useErpAuth } from '../store/authStore.js';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export default function Login() {
  const login = useErpAuth((s) => s.login);
  const user = useErpAuth((s) => s.user);
  const ready = useErpAuth((s) => s.ready);
  const navigate = useNavigate();
  const remembered = rememberedEmail('erp');
  const [mode, setMode] = useState('email');
  const [form, setForm] = useState({ email: remembered, password: '', pin: '', remember: Boolean(remembered) });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'email') rememberEmail('erp', form.email, form.remember);
      await login(mode === 'pin' ? { pin: form.pin } : { email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || (mode === 'pin' ? 'Wrong PIN' : 'Wrong email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell badge="ERP — In-Store System" logoSrc={logoSrc}>
      <h1>Store register</h1>
      <p className="auth-lead">Sign in with email, or use a staff PIN on a shared terminal.</p>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-tabs">
          <button className={mode === 'email' ? 'on' : ''} type="button" onClick={() => setMode('email')}>
            Email
          </button>
          <button className={mode === 'pin' ? 'on' : ''} type="button" onClick={() => setMode('pin')}>
            PIN
          </button>
        </div>
        <AuthError>{error}</AuthError>
        {mode === 'pin' ? (
          <AuthField label="Staff PIN">
            <input
              className="auth-pin"
              inputMode="numeric"
              autoComplete="off"
              required
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 8) })}
            />
          </AuthField>
        ) : (
          <>
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
              <input
                type="password"
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
          </>
        )}
        <AuthButton loading={loading}>Sign in to ERP</AuthButton>
      </form>
    </AuthShell>
  );
}
