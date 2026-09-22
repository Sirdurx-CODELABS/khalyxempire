import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../store/authStore.js';

export default function Profile() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar: '',
    currentPassword: '',
    password: '',
    confirm: ''
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: user.name || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    }));
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    if (form.password && form.password !== form.confirm) {
      setError('New passwords do not match');
      setBusy(false);
      return;
    }
    try {
      const body = {
        name: form.name,
        phone: form.phone,
        avatar: form.avatar
      };
      if (form.password) {
        body.password = form.password;
        body.currentPassword = form.currentPassword;
      }
      const { data } = await api.patch('/auth/me', body);
      setUser(data.user);
      setForm((f) => ({ ...f, currentPassword: '', password: '', confirm: '' }));
      setMessage(form.password ? 'Profile and password updated.' : 'Profile saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  const isGoogle = user?.authProvider === 'auth0';

  return (
    <form className="form profile-form" onSubmit={save}>
      <h3>Profile</h3>
      <p className="muted">Update how we reach you and what appears on your orders.</p>
      {error ? <p className="alert">{error}</p> : null}
      {message ? <p className="ok-msg">{message}</p> : null}
      <div className="profile-avatar-row">
        {form.avatar ? <img className="profile-avatar" src={form.avatar} alt="" /> : <span className="profile-avatar placeholder">KE</span>}
        <div>
          <label className="field-label">Photo URL</label>
          <input
            placeholder="https://…"
            value={form.avatar}
            onChange={(e) => setForm({ ...form, avatar: e.target.value })}
          />
          {isGoogle ? <p className="muted">Signed in with Google — you can still set a custom photo URL.</p> : null}
        </div>
      </div>
      <label className="field-label">Full name</label>
      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="field-label">Email</label>
      <input value={user?.email || ''} disabled />
      <label className="field-label">Phone</label>
      <input placeholder="WhatsApp / mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

      <h3 style={{ marginTop: 24 }}>Password</h3>
      {isGoogle && !user?.hasPassword ? (
        <p className="muted">You signed up with Google. Set a password below if you also want email sign-in.</p>
      ) : null}
      {user?.hasPassword ? (
        <>
          <label className="field-label">Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder={form.password ? 'Required to change password' : 'Only needed to change password'}
          />
        </>
      ) : null}
      <label className="field-label">New password</label>
      <input
        type="password"
        minLength={8}
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        placeholder="Leave blank to keep current"
      />
      <label className="field-label">Confirm new password</label>
      <input
        type="password"
        minLength={8}
        autoComplete="new-password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
      />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
