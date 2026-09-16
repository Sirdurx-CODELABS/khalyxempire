import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../store/authStore.js';
import Field from '../components/Field.jsx';

export default function Login() {
  const login = useAdminAuth((s) => s.login);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@khalyx.ng', password: 'KhalyxAdmin!23' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not sign in');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card form-grid" onSubmit={submit}>
        <p className="muted" style={{ letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0 }}>
          Khalyx Empire
        </p>
        <h1>Store admin</h1>
        {error ? <p className="alert">{error}</p> : null}
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
