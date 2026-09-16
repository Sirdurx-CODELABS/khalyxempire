import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpAuth } from '../store/authStore.js';

export default function Login() {
  const login = useErpAuth((s) => s.login);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'staff@khalyx.ng', password: 'KhalyxStaff!23' });
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
        <p className="muted" style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          In-store
        </p>
        <h1>Khalyx register</h1>
        {error ? <p className="alert">{error}</p> : null}
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn pay" type="submit">
          Clock in to POS
        </button>
      </form>
    </div>
  );
}
