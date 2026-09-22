import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from '@khalyx/ui';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';
import GoogleSignIn from '../components/GoogleSignIn.jsx';
import Seo from '../components/Seo.jsx';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const refresh = useCart((s) => s.refresh);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      await refresh();
      navigate('/account');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account');
    }
  };

  return (
    <div className="section">
      <Seo title="Create account" path="/register" />
      <form className="form container auth-form" onSubmit={submit}>
        <h1>Create account</h1>
        {error ? <p className="alert">{error}</p> : null}
        <GoogleSignIn next="/account" label="Sign up with Google" />
        <p className="or-line">or create with email</p>
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <PasswordInput
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="btn full" type="submit">
          Join Khalyx
        </button>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
