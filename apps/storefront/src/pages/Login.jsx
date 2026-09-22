import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PasswordInput } from '@khalyx/ui';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';
import Seo from '../components/Seo.jsx';
import GoogleSignIn from '../components/GoogleSignIn.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const refresh = useCart((s) => s.refresh);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(params.get('error') || '');
  const next = params.get('next') || '/account';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      await refresh();
      navigate(next.startsWith('/') ? next : '/account');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in');
    }
  };

  return (
    <div className="section">
      <Seo title="Sign in" path="/login" />
      <form className="form container auth-form" onSubmit={submit}>
        <h1>Sign in</h1>
        {error ? <p className="alert">{error}</p> : null}
        <GoogleSignIn next={next} />
        <p className="or-line">or sign in with email</p>
        <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput required placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn full" type="submit">
          Continue
        </button>
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
