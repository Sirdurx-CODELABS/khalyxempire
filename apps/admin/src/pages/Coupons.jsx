import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const blank = { code: '', type: 'percent', value: 10, minSubtotal: 0, maxUses: 0, expiresAt: '', isActive: true, categoryIds: [] };

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(blank);

  const load = () => api.get('/admin/coupons').then(({ data }) => setCoupons(data.coupons));

  useEffect(() => {
    load();
    api.get('/categories').then(({ data }) => setCats(data.categories || []));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/admin/coupons', form);
    setForm(blank);
    load();
  };

  const toggle = async (c) => {
    await api.patch(`/admin/coupons/${c._id}`, { isActive: !c.isActive });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/admin/coupons/${id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Coupons</h1>
      </div>
      <div className="split" style={{ display: 'grid', gap: 16 }}>
        <DataTable
          rows={coupons}
          searchKeys={['code']}
          searchPlaceholder="Coupon code"
          columns={[
            { id: 'code', header: 'Code', accessor: (c) => c.code },
            {
              id: 'value',
              header: 'Value',
              accessor: (c) => c.value,
              cell: (c) => (c.type === 'percent' ? `${c.value}%` : `₦${c.value}`)
            },
            { id: 'used', header: 'Used', accessor: (c) => c.usedCount, cell: (c) => `${c.usedCount}/${c.maxUses || '∞'}` },
            {
              id: 'status',
              header: 'Status',
              accessor: (c) => (c.isActive ? 'active' : 'off'),
              cell: (c) => <span className={`badge ${c.isActive ? 'paid' : 'cancelled'}`}>{c.isActive ? 'active' : 'off'}</span>
            },
            {
              id: 'actions',
              header: '',
              sortable: false,
              cell: (c) => (
                <>
                  <button className="btn small ghost" type="button" onClick={() => toggle(c)}>
                    Toggle
                  </button>{' '}
                  <button className="btn small danger" type="button" onClick={() => remove(c._id)}>
                    Delete
                  </button>
                </>
              )
            }
          ]}
        />
        <form className="panel form-grid" onSubmit={save}>
          <h3>New coupon</h3>
          <Field label="Code" required>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed NGN</option>
            </select>
          </Field>
          <Field label="Value">
            <input type="number" required value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </Field>
          <Field label="Minimum subtotal (NGN)">
            <input type="number" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: Number(e.target.value) })} />
          </Field>
          <Field label="Max uses" hint="0 means unlimited">
            <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
          </Field>
          <Field label="Expires">
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </Field>
          <Field label="Restrict to category" hint="Leave empty for all products">
            <select
              value={form.categoryIds[0] || ''}
              onChange={(e) => setForm({ ...form, categoryIds: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      </div>
    </>
  );
}
