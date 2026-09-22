import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthButton, AuthError, AuthField, AuthShell, AuthSuccess } from '@khalyx/auth-ui';
import { api } from '../api/client.js';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email, app: 'erp' });
      setSent(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send a reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell badge="ERP — In-Store System" logoSrc={logoSrc}>
      {sent ? (
        <>
          <AuthSuccess title="Check your inbox">
            If that email is on file, we sent a link to choose a new password. It expires in one hour.
          </AuthSuccess>
          {sent.devLink ? (
            <p className="auth-lead">
              Local preview link:{' '}
              <a className="auth-link" href={sent.devLink}>
                Reset password
              </a>
            </p>
          ) : null}
          <p className="auth-foot">
            <Link className="auth-link" to="/login">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <h1>Forgot password</h1>
          <p className="auth-lead">Enter the email on your ERP account. We will send a reset link if it matches.</p>
          <form className="auth-form" onSubmit={submit}>
            <AuthError>{error}</AuthError>
            <AuthField label="Email">
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </AuthField>
            <AuthButton loading={loading}>Send reset link</AuthButton>
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
