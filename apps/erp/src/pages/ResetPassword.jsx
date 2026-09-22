import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthButton, AuthError, AuthField, AuthShell, AuthSuccess, PasswordInput } from '@khalyx/auth-ui';
import { api } from '../api/client.js';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setValid(false);
      setError('This reset link is missing a token.');
      return;
    }
    api
      .get(`/auth/reset-password/${token}`)
      .then(() => setValid(true))
      .catch(() => {
        setValid(false);
        setError('This reset link is invalid or has expired.');
      });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell badge="ERP — In-Store System" logoSrc={logoSrc}>
      {done ? (
        <>
          <AuthSuccess title="Password updated">
            Your ERP password is ready. Sign in on this terminal when you are on shift.
          </AuthSuccess>
          <Link className="auth-btn" to="/login" style={{ textDecoration: 'none' }}>
            Sign in
          </Link>
        </>
      ) : (
        <>
          <h1>Set a new password</h1>
          <p className="auth-lead">Choose a password with at least 8 characters.</p>
          <form className="auth-form" onSubmit={submit}>
            <AuthError>{error}</AuthError>
            <AuthField label="New password">
              <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </AuthField>
            <AuthField label="Confirm password">
              <PasswordInput required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </AuthField>
            <AuthButton loading={loading} disabled={!valid}>
              Save password
            </AuthButton>
          </form>
          <p className="auth-foot">
            <Link className="auth-link" to="/login">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
