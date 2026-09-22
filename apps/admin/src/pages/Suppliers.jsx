import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SUPPLIER_CATEGORIES } from '@khalyx/shared';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { useAdminAuth } from '../store/authStore.js';
import { useLive } from '../hooks/useLive.js';
import Field from '../components/Field.jsx';

const blank = () => ({
  name: '',
  contactName: '',
  email: '',
  phone: '',
  whatsapp: '',
  category: 'other',
  tags: '',
  address: '',
  paymentTerms: 'Net 30',
  balance: 0,
  notes: ''
});

function submittedLabel(s) {
  const who = s.submittedBy?.name || 'Unknown user';
  const from = s.submittedFrom === 'admin' ? 'Admin' : 'ERP';
  return `${who} · ${from}`;
}

function wa(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function StatusBadge({ status }) {
  return <span className={`badge ${status || 'pending'}`}>{String(status || 'pending').replace('_', ' ')}</span>;
}

export default function Suppliers() {
  const canReview = useAdminAuth((s) => s.user)?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const openId = params.get('id') || '';
  const [suppliers, setSuppliers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [alerts, setAlerts] = useState({ pendingSuppliers: 0, pendingRequests: 0 });
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState('');
  const [profile, setProfile] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const load = async () => {
    const [{ data: list }, { data: reqs }] = await Promise.all([
      api.get('/admin/suppliers'),
      api.get('/admin/suppliers/requests')
    ]);
    setSuppliers(list.suppliers || []);
    setAlerts({ pendingSuppliers: list.pendingSuppliers || 0, pendingRequests: list.pendingRequests || 0 });
    setRequests(reqs.requests || []);
    if (selectedId) {
      const { data } = await api.get(`/admin/suppliers/${selectedId}`);
      setProfile(data);
    }
  };

  useEffect(() => {
    if (openId) setSelectedId(openId);
  }, [openId]);

  useLive(load, 4000);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    api.get(`/admin/suppliers/${selectedId}`).then(({ data }) => setProfile(data));
  }, [selectedId]);

  const setTab = (next) => {
    const copy = new URLSearchParams(params);
    if (next === 'all') copy.delete('tab');
    else copy.set('tab', next);
    setParams(copy, { replace: true });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, tags: form.tags };
      if (editing) await api.patch(`/admin/suppliers/${editing}`, payload);
      else await api.post('/admin/suppliers', payload);
      setForm(blank());
      setEditing('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save supplier');
    }
  };

  const setStatus = async (id, status) => {
    setError('');
    try {
      await api.patch(`/admin/suppliers/${id}`, { status, reviewNote });
      setReviewNote('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    }
  };

  const setRequestStatus = async (id, status) => {
    await api.patch(`/admin/suppliers/requests/${id}`, { status });
    await load();
  };

  const fill = (s) => {
    setEditing(s._id);
    setSelectedId(s._id);
    setForm({
      name: s.name || '',
      contactName: s.contactName || '',
      email: s.email || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      category: s.category || 'other',
      tags: (s.tags || []).join(', '),
      address: s.address || '',
      paymentTerms: s.paymentTerms || 'Net 30',
      balance: s.balance || 0,
      notes: s.notes || ''
    });
  };

  const pending = suppliers.filter((s) => s.status === 'pending');
  const rows = tab === 'pending' ? pending : suppliers;

  return (
    <>
      <div className="page-head">
        <h1>Suppliers</h1>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        Approve vendors, track restock requests, and keep Admin and ERP on the same supplier list.
      </p>
      {error ? <p className="alert">{error}</p> : null}
      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'on' : ''}`} type="button" onClick={() => setTab('all')}>
          All
        </button>
        <button className={`tab ${tab === 'pending' ? 'on' : ''}`} type="button" onClick={() => setTab('pending')}>
          Pending suppliers {alerts.pendingSuppliers ? `(${alerts.pendingSuppliers})` : ''}
        </button>
        <button className={`tab ${tab === 'requests' ? 'on' : ''}`} type="button" onClick={() => setTab('requests')}>
          Supply requests {alerts.unreadRequests ? <span className="nav-count danger">{alerts.unreadRequests}</span> : alerts.pendingRequests ? `(${alerts.pendingRequests})` : ''}
        </button>
      </div>

      {tab === 'requests' ? (
        <div className="panel">
          <h2>Supply requests</h2>
          <DataTable
            rows={requests}
            searchKeys={['message']}
            searchPlaceholder="Search requests"
            empty="No supply requests yet."
            rowClassName={(r) => {
              if (r.status === 'fulfilled') return 'is-ok';
              if (r.status === 'in_progress') return 'is-pending';
              if (!r.seenAt) return 'is-urgent';
              return 'is-pending';
            }}
            columns={[
              { id: 'supplier', header: 'Supplier', accessor: (r) => r.supplier?.name || '' },
              {
                id: 'requestedBy',
                header: 'Requested by',
                accessor: (r) => r.requestedBy?.name || 'Staff',
                cell: (r) => (
                  <>
                    {r.requestedBy?.name || 'Staff'}
                    <div className="muted">{r.source === 'admin' ? 'Admin' : 'ERP'}</div>
                  </>
                )
              },
              { id: 'message', header: 'Message', accessor: (r) => r.message },
              { id: 'createdAt', header: 'When', accessor: (r) => r.createdAt, cell: (r) => new Date(r.createdAt).toLocaleString() },
              {
                id: 'status',
                header: 'Status',
                accessor: (r) => r.status,
                cell: (r) => (
                  <>
                    <StatusBadge status={r.status} />
                    <select style={{ marginLeft: 8 }} value={r.status} onChange={(e) => setRequestStatus(r._id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="fulfilled">Fulfilled</option>
                    </select>
                  </>
                )
              }
            ]}
          />
        </div>
      ) : (
        <div className="staff-split suppliers-layout">
          <div>
            <DataTable
              rows={rows}
              searchKeys={['name', 'email', 'phone', 'contactName']}
              searchPlaceholder="Name, contact, phone"
              columns={[
                {
                  id: 'name',
                  header: 'Supplier',
                  accessor: (s) => s.name,
                  cell: (s) => (
                    <>
                      <button className="linkish" type="button" onClick={() => setSelectedId(s._id)}>
                        {s.name}
                      </button>
                      <div className="muted">{s.email || s.phone}</div>
                    </>
                  )
                },
                {
                  id: 'contactName',
                  header: 'Contact',
                  accessor: (s) => s.contactName || '',
                  cell: (s) => (
                    <>
                      {s.contactName || '—'}
                      <div className="muted">
                        {s.whatsapp ? (
                          <a href={wa(s.whatsapp)} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                        ) : (
                          s.phone || '—'
                        )}
                      </div>
                    </>
                  )
                },
                {
                  id: 'category',
                  header: 'Category',
                  accessor: (s) => s.category,
                  cell: (s) => (
                    <>
                      {s.category}
                      <div className="muted">{(s.tags || []).join(', ')}</div>
                    </>
                  )
                },
                {
                  id: 'submitted',
                  header: 'Submitted',
                  accessor: (s) => s.createdAt,
                  cell: (s) => (
                    <>
                      {submittedLabel(s)}
                      <div className="muted">{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</div>
                    </>
                  )
                },
                {
                  id: 'status',
                  header: 'Status',
                  accessor: (s) => s.status,
                  cell: (s) => <StatusBadge status={s.status} />
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  sortable: false,
                  cell: (s) => (
                    <>
                      <button className="btn ghost small" type="button" onClick={() => fill(s)}>
                        Edit
                      </button>
                      {canReview && s.status === 'pending' ? (
                        <>
                          {' '}
                          <button className="btn small" type="button" onClick={() => setStatus(s._id, 'approved')}>
                            Approve
                          </button>{' '}
                          <button className="btn ghost small" type="button" onClick={() => setStatus(s._id, 'declined')}>
                            Decline
                          </button>
                        </>
                      ) : null}
                      {canReview && s.status === 'declined' ? (
                        <>
                          {' '}
                          <button className="btn small" type="button" onClick={() => setStatus(s._id, 'approved')}>
                            Approve
                          </button>
                        </>
                      ) : null}
                    </>
                  )
                }
              ]}
            />
            {tab === 'pending' && canReview ? (
              <Field label="Review note" hint="Saved on the next approve or decline">
                <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
              </Field>
            ) : null}
          </div>
          <div>
            <form className="panel form-grid" onSubmit={save}>
              <h3>{editing ? 'Edit supplier' : 'Add supplier'}</h3>
              <p className="muted">New suppliers start as Pending until an admin approves them.</p>
              <Field label="Name" required>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Contact">
                <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="What they supply" hint="Comma-separated tags, e.g. shoes, abayas, bags">
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Payment terms">
                <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
              </Field>
              <Field label="Outstanding balance">
                <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
              </Field>
              <Field label="Internal notes">
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
              <button className="btn" type="submit">
                {editing ? 'Save changes' : 'Submit for approval'}
              </button>
            </form>
            {profile?.supplier ? (
              <div className="panel" style={{ marginTop: 16 }}>
                <h3>{profile.supplier.name}</h3>
                <p>
                  <StatusBadge status={profile.supplier.status} /> · terms {profile.supplier.paymentTerms || '—'} · balance{' '}
                  {money(profile.supplier.balance)} · spend {money(profile.supplier.spend)}
                </p>
                <p className="muted">{profile.supplier.notes || 'No internal notes yet.'}</p>
                <h4>Linked purchase orders</h4>
                {(profile.purchaseOrders || []).length === 0 ? <p className="muted">No purchase orders yet.</p> : null}
                {(profile.purchaseOrders || []).map((po) => (
                  <p key={po._id}>
                    {po.poNumber} · {po.status} · {new Date(po.createdAt).toLocaleDateString()}
                  </p>
                ))}
                <h4>Restock requests</h4>
                {(profile.requests || []).map((r) => (
                  <p key={r._id}>
                    <StatusBadge status={r.status} /> {r.message}
                    <br />
                    <small className="muted">
                      {r.requestedBy?.name} · {new Date(r.createdAt).toLocaleString()}
                    </small>
                  </p>
                ))}
                <p>
                  <Link to="/suppliers?tab=requests">Open supply requests</Link>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
