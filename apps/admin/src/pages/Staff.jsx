import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const blank = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'staff',
  permissions: ['dashboard', 'products', 'orders', 'customers', 'inventory', 'coupons', 'reports']
};

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [form, setForm] = useState(blank);

  const load = () =>
    api.get('/admin/staff').then(({ data }) => {
      setUsers(data.users);
      setPermissions(data.permissions);
    });

  useEffect(() => {
    load();
  }, []);

  const togglePerm = (perm) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter((p) => p !== perm) : [...f.permissions, perm]
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    await api.post('/admin/staff', form);
    setForm(blank);
    load();
  };

  const setActive = async (user, isActive) => {
    await api.patch(`/admin/staff/${user.id}`, { isActive });
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Staff</h1>
      </div>
      <div className="split" style={{ display: 'grid', gap: 16 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Permissions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  <div className="muted">{u.email}</div>
                </td>
                <td>{u.role}</td>
                <td>{u.role === 'admin' ? 'all' : (u.permissions || []).join(', ')}</td>
                <td>
                  {u.isActive ? (
                    <button className="btn small danger" type="button" onClick={() => setActive(u, false)}>
                      Deactivate
                    </button>
                  ) : (
                    <button className="btn small ghost" type="button" onClick={() => setActive(u, true)}>
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="panel form-grid" onSubmit={save}>
          <h3>Invite staff</h3>
          <Field label="Full name">
            <input required placeholder="Ada Okonkwo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input required type="email" placeholder="ada@khalyx.ng" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <input required type="password" minLength={8} placeholder="8+ characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Permissions">
            <div className="checks">
            {permissions
              .filter((p) => p !== 'staff')
              .map((p) => (
                <label key={p}>
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} /> {p}
                </label>
              ))}
            </div>
          </Field>
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      </div>
    </>
  );
}
