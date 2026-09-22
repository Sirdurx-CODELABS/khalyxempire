import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUPPLIER_CATEGORIES } from '@khalyx/shared';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { useLive } from '../hooks/useLive.js';
import Field from '../components/Field.jsx';

const blank = {
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
};

function StatusBadge({ status }) {
  return <span className={`badge ${status || 'pending'}`}>{String(status || 'pending').replace('_', ' ')}</span>;
}

function wa(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [profile, setProfile] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/erp/suppliers');
    setSuppliers(data.suppliers || []);
    if (selectedId) {
      const detail = await api.get(`/erp/suppliers/${selectedId}`);
      setProfile(detail.data);
    }
  };

  useLive(load, 4000);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    api.get(`/erp/suppliers/${selectedId}`).then(({ data }) => setProfile(data));
  }, [selectedId]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.patch(`/erp/suppliers/${editing}`, form);
      else await api.post('/erp/suppliers', form);
      setForm(blank);
      setEditing('');
      setNotice(editing ? 'Supplier updated.' : 'Supplier submitted as Pending. Admin must approve before it can be used on purchase orders.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save supplier');
    }
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    try {
      await api.post(`/erp/suppliers/${selectedId}/requests`, { message: requestMessage });
      setRequestMessage('');
      setRequestOpen(false);
      setNotice('Restock request sent to Admin.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send request');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Suppliers</h1>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {notice ? <p className="ok">{notice}</p> : null}
      <div className="pos suppliers-layout">
        <div>
          <DataTable
            rows={suppliers}
            searchKeys={['name', 'contactName', 'phone', 'email']}
            searchPlaceholder="Name or contact"
            columns={[
              {
                id: 'name',
                header: 'Name',
                accessor: (s) => s.name,
                cell: (s) => (
                  <>
                    <button className="linkish" type="button" onClick={() => setSelectedId(s._id)}>
                      {s.name}
                    </button>
                    <div className="muted">{money(s.spend || 0)} spend</div>
                  </>
                )
              },
              {
                id: 'contactName',
                header: 'Contact',
                accessor: (s) => s.contactName || '',
                cell: (s) => (
                  <>
                    {s.contactName}
                    <div className="muted">
                      {s.whatsapp ? (
                        <a href={wa(s.whatsapp)} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      ) : (
                        s.phone
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
                  <button
                    className="btn ghost small"
                    type="button"
                    onClick={() => {
                      setEditing(s._id);
                      setSelectedId(s._id);
                      setForm({
                        name: s.name,
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
                    }}
                  >
                    Edit
                  </button>
                )
              }
            ]}
          />
          {profile?.supplier ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>
                {profile.supplier.name} <StatusBadge status={profile.supplier.status} />
              </h3>
              <p className="muted">
                {profile.supplier.contactName} · {profile.supplier.phone} · terms {profile.supplier.paymentTerms || '—'}
              </p>
              <p>
                Spend {money(profile.supplier.spend)} · {profile.supplier.orderCount || 0} POs · outstanding{' '}
                {money(profile.supplier.balance)}
              </p>
              <p className="muted">{profile.supplier.notes || 'No internal notes.'}</p>
              <button className="btn" type="button" onClick={() => setRequestOpen(true)}>
                Request supply
              </button>{' '}
              {profile.supplier.status === 'approved' ? (
                <button className="btn ghost" type="button" onClick={() => navigate(`/purchase-orders?supplier=${profile.supplier._id}`)}>
                  New purchase order
                </button>
              ) : (
                <span className="muted"> Only approved suppliers can be used on purchase orders.</span>
              )}
              <h4>Order history</h4>
              {(profile.purchaseOrders || []).length === 0 ? <p className="muted">No linked purchase orders.</p> : null}
              {(profile.purchaseOrders || []).map((po) => (
                <p key={po._id}>
                  {po.poNumber} · {po.status} · {new Date(po.createdAt).toLocaleDateString()}
                </p>
              ))}
              <h4>Your restock requests</h4>
              {(profile.requests || []).length === 0 ? <p className="muted">None yet for this supplier.</p> : null}
              {(profile.requests || []).map((r) => (
                <p key={r._id}>
                  <StatusBadge status={r.status} /> {r.message}
                  <br />
                  <small className="muted">{new Date(r.createdAt).toLocaleString()}</small>
                </p>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 16 }}>
              Select a supplier to see order history, balance, and request stock.
            </p>
          )}
        </div>
        <form className="panel form-grid" onSubmit={save}>
          <h3>{editing ? 'Edit supplier' : 'Add supplier'}</h3>
          <p className="muted">Every new supplier is Pending until Admin approves it.</p>
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
          <Field label="Tags" hint="shoes, abayas, bags">
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
            {editing ? 'Save' : 'Submit pending supplier'}
          </button>
        </form>
      </div>
      {requestOpen ? (
        <div className="modal-backdrop" onClick={() => setRequestOpen(false)}>
          <form className="modal panel form-grid" onClick={(e) => e.stopPropagation()} onSubmit={sendRequest}>
            <h3>Request supply</h3>
            <p className="muted">Admin sees this instantly under Supply Requests, with your name and this supplier.</p>
            <Field label="What you need" required>
              <textarea required rows={4} value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} />
            </Field>
            <div>
              <button className="btn" type="submit">
                Send to Admin
              </button>{' '}
              <button className="btn ghost" type="button" onClick={() => setRequestOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
