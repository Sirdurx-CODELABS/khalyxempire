import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthButton, AuthError, AuthField, AuthShell, AuthSuccess, PasswordInput } from '@khalyx/auth-ui';
import { api } from '../api/client.js';
import { useAdminAuth } from '../store/authStore.js';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export default function InviteAccept() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const acceptSession = useAdminAuth((s) => s.acceptSession);
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('This invite link is missing a token.');
      return;
    }
    api
      .get(`/auth/invite/${token}`)
      .then(({ data }) => setInvite(data.invite))
      .catch(() => setError('This invite is invalid or has expired.'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/invite/accept', { token, password: form.password, name: invite?.name });
      acceptSession(data);
      setDone(true);
      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not accept invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell badge="Admin Portal" logoSrc={logoSrc}>
      {done ? (
        <AuthSuccess title="You are in">Welcome to Khalyx Empire. Opening the admin dashboard…</AuthSuccess>
      ) : (
        <>
          <h1>Accept your invite</h1>
          <p className="auth-lead">
            {invite ? `${invite.name} · ${invite.email}` : 'Set a password to join the Admin Portal.'}
          </p>
          <form className="auth-form" onSubmit={submit}>
            <AuthError>{error}</AuthError>
            <AuthField label="New password">
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </AuthField>
            <AuthField label="Confirm password">
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </AuthField>
            <AuthButton loading={loading} disabled={!invite}>
              Create password & continue
            </AuthButton>
          </form>
          <p className="auth-foot">
            Already have an account?{' '}
            <Link className="auth-link" to="/login">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
