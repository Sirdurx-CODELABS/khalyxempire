import { useState } from 'react';
import { PERMISSIONS, permissionsForTitle } from '@khalyx/shared';
import { DataTable } from '@khalyx/ui';
import { api } from '../../api/client.js';
import Field from '../../components/Field.jsx';
import { ACCESS_LABELS, TITLE_LABELS } from './labels.js';

const blank = () => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  avatar: '',
  staffTitle: 'sales',
  access: 'erp',
  pin: '',
  invite: false,
  permissions: permissionsForTitle('sales')
});

export default function People({ users, meta, canEdit, onChange }) {
  const [q, setQ] = useState('');
  const [access, setAccess] = useState('');
  const [title, setTitle] = useState('');
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');

  const filtered = users.filter((u) => {
    if (access && u.access !== access) return false;
    if (title && u.staffTitle !== title) return false;
    if (q) {
      const hay = `${u.name} ${u.email} ${u.phone}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const setTitleAndPerms = (staffTitle) => {
    setForm((f) => ({
      ...f,
      staffTitle,
      permissions: staffTitle === 'admin' ? PERMISSIONS : permissionsForTitle(staffTitle),
      access: staffTitle === 'admin' && f.access === 'erp' ? 'both' : f.access
    }));
  };

  const edit = (user) => {
    setEditing(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      staffTitle: user.staffTitle || 'sales',
      access: user.access || 'erp',
      pin: '',
      permissions: user.role === 'admin' ? PERMISSIONS : user.permissions || []
    });
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const body = new FormData();
    body.append('images', file);
    const { data } = await api.post('/admin/uploads', body);
    setForm((f) => ({ ...f, avatar: data.urls?.[0] || f.avatar }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        accountType: form.staffTitle === 'admin' ? 'admin' : 'staff'
      };
      if (editing) {
        if (!payload.password) delete payload.password;
        if (!payload.pin) delete payload.pin;
        await api.patch(`/admin/staff/${editing}`, payload);
        setInviteUrl('');
      } else {
        const { data } = await api.post('/admin/staff', payload);
        setInviteUrl(data.user?.inviteUrl || '');
      }
      setForm(blank());
      setEditing('');
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save staff');
    }
  };

  const openDetail = async (id) => {
    const { data } = await api.get(`/admin/staff/${id}`);
    setDetail(data);
  };

  return (
    <div className="staff-split">
      <div>
        <div className="toolbar no-print">
          <Field label="System access">
            <select value={access} onChange={(e) => setAccess(e.target.value)}>
              <option value="">All systems</option>
              <option value="admin">Admin only</option>
              <option value="erp">ERP only</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <Field label="Role">
            <select value={title} onChange={(e) => setTitle(e.target.value)}>
              <option value="">All roles</option>
              {(meta.titles || Object.keys(TITLE_LABELS)).map((t) => (
                <option key={t} value={t}>
                  {TITLE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <DataTable
          rows={filtered}
          rowKey={(u) => u.id}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Name, email, phone"
          searchKeys={['name', 'email', 'phone']}
          columns={[
            {
              id: 'name',
              header: 'Staff',
              accessor: (u) => u.name,
              cell: (u) => (
                <div className="staff-row">
                  {u.avatar ? <img className="avatar" src={u.avatar} alt="" /> : <span className="avatar fallback">{u.name?.[0]}</span>}
                  <span>
                    <strong>{u.name}</strong>
                    <div className="muted">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ''}
                    </div>
                  </span>
                </div>
              )
            },
            { id: 'staffTitle', header: 'Role', accessor: (u) => TITLE_LABELS[u.staffTitle] || u.staffTitle || u.role },
            { id: 'access', header: 'Access', accessor: (u) => ACCESS_LABELS[u.access] || u.access || '—' },
            {
              id: 'isActive',
              header: 'Status',
              accessor: (u) => (u.isActive ? 'active' : 'off'),
              cell: (u) => <span className={`badge ${u.isActive ? 'paid' : 'cancelled'}`}>{u.isActive ? 'active' : 'off'}</span>
            },
            {
              id: 'actions',
              header: 'Actions',
              sortable: false,
              cell: (u) => (
                <>
                  <button className="btn small ghost" type="button" onClick={() => openDetail(u.id)}>
                    Profile
                  </button>
                  {canEdit ? (
                    <>
                      {' '}
                      <button className="btn small ghost" type="button" onClick={() => edit(u)}>
                        Edit
                      </button>{' '}
                      <button
                        className="btn small ghost"
                        type="button"
                        onClick={() => api.patch(`/admin/staff/${u.id}`, { isActive: !u.isActive }).then(onChange)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>{' '}
                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => {
                          if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
                          api.delete(`/admin/staff/${u.id}`).then(onChange);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </>
              )
            }
          ]}
        />
        {detail ? (
          <div className="panel" style={{ marginTop: 16 }}>
            <h3>
              {detail.user?.name} · {detail.performance?.orders || 0} POS sales · ₦
              {Number(detail.performance?.revenue || 0).toLocaleString('en-NG')}
            </h3>
            <p className="muted">
              This week: {detail.attendance?.summary?.present || 0} present · {detail.attendance?.summary?.absent || 0} absent ·{' '}
              {detail.attendance?.summary?.late || 0} late · {detail.attendance?.summary?.hours || 0}h
            </p>
            <DataTable
              rows={detail.clocks || []}
              searchPlaceholder="Clock records"
              columns={[
                {
                  id: 'clockIn',
                  header: 'Clock in',
                  accessor: (c) => c.clockIn,
                  cell: (c) => (
                    <>
                      {new Date(c.clockIn).toLocaleString()}
                      {c.late ? <span className="badge low">late</span> : null}
                    </>
                  )
                },
                { id: 'clockOut', header: 'Out', accessor: (c) => (c.clockOut ? new Date(c.clockOut).toLocaleString() : 'on shift') },
                { id: 'shiftName', header: 'Shift', accessor: (c) => c.shiftName || '—' },
                { id: 'hours', header: 'Hours', accessor: (c) => Number(c.hours || 0), cell: (c) => (c.hours || 0).toFixed?.(2) || c.hours }
              ]}
            />
          </div>
        ) : null}
      </div>
      {canEdit ? (
        <form className="panel form-grid no-print" onSubmit={save}>
          <h3>{editing ? 'Edit staff' : 'Add staff'}</h3>
          {error ? <p className="alert">{error}</p> : null}
          <Field label="Photo">
            <input type="file" accept="image/*" onChange={uploadPhoto} />
          </Field>
          {form.avatar ? <img className="avatar lg" src={form.avatar} alt="" /> : null}
          <Field label="Full name" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={Boolean(editing)} />
          </Field>
          {!editing ? (
            <label>
              <input type="checkbox" checked={form.invite} onChange={(e) => setForm({ ...form, invite: e.target.checked, password: e.target.checked ? '' : form.password })} />
              Email an invite so they set their own password
            </label>
          ) : null}
          {form.invite && !editing ? (
            <p className="muted">They will receive a branded invite to the Admin or ERP login screen.</p>
          ) : (
            <Field label="Password" hint={editing ? 'Leave blank to keep' : 'Min 8 characters'} required={!editing && !form.invite}>
              <input type="password" minLength={editing || form.invite ? 0 : 8} required={!editing && !form.invite} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          )}
          {inviteUrl ? (
            <p className="ok">
              Invite sent.{' '}
              <a href={inviteUrl} target="_blank" rel="noreferrer">
                Open invite link
              </a>
            </p>
          ) : null}
          <Field label="Clock PIN">
            <input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
          </Field>
          <Field label="Role">
            <select value={form.staffTitle} onChange={(e) => setTitleAndPerms(e.target.value)}>
              {Object.entries(TITLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="System access" hint="Controls which software they can open">
            <select value={form.access} onChange={(e) => setForm({ ...form, access: e.target.value })}>
              <option value="erp">ERP system only</option>
              <option value="admin">Admin dashboard only</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <Field label="Module permissions">
            <div className="checks">
              {PERMISSIONS.map((p) => (
                <label key={p}>
                  <input
                    type="checkbox"
                    checked={form.staffTitle === 'admin' || form.permissions.includes(p)}
                    disabled={form.staffTitle === 'admin'}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p]
                      }))
                    }
                  />{' '}
                  {p}
                </label>
              ))}
            </div>
          </Field>
          <button className="btn" type="submit">
            {editing ? 'Save changes' : 'Create account'}
          </button>
          {editing ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setEditing('');
                setForm(blank());
              }}
            >
              Cancel
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
