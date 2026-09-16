import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const blank = { code: '', type: 'percent', value: 10, minSubtotal: 0, maxUses: 0, isActive: true };

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(blank);

  const load = () => api.get('/admin/coupons').then(({ data }) => setCoupons(data.coupons));

  useEffect(() => {
    load();
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
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Value</th>
              <th>Used</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c._id}>
                <td>{c.code}</td>
                <td>
                  {c.type === 'percent' ? `${c.value}%` : `₦${c.value}`}
                </td>
                <td>
                  {c.usedCount}/{c.maxUses || '∞'}
                </td>
                <td>
                  <span className={`badge ${c.isActive ? 'paid' : 'cancelled'}`}>{c.isActive ? 'active' : 'off'}</span>
                </td>
                <td>
                  <button className="btn small ghost" type="button" onClick={() => toggle(c)}>
                    Toggle
                  </button>{' '}
                  <button className="btn small danger" type="button" onClick={() => remove(c._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="panel form-grid" onSubmit={save}>
          <h3>New coupon</h3>
          <Field label="Code">
            <input required placeholder="KEGOLD10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
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
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      </div>
    </>
  );
}
