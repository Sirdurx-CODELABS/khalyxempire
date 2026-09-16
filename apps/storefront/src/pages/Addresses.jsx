import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const blank = { fullName: '', phone: '', line1: '', city: '', state: 'Lagos', postalCode: '', isDefault: true };

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(blank);

  const load = () => api.get('/addresses').then(({ data }) => setAddresses(data.addresses));

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/addresses', form);
    setForm(blank);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/addresses/${id}`);
    load();
  };

  return (
    <div className="account-grid">
      <div>
        {addresses.map((a) => (
          <article key={a._id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <strong>{a.fullName}</strong>
            <p>
              {a.line1}, {a.city}, {a.state}
            </p>
            <button type="button" className="icon-btn" onClick={() => remove(a._id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
      <form className="form" onSubmit={save}>
        <h3>Save an address</h3>
        <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input required placeholder="Street" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
        <div className="form-row">
          <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
    </div>
  );
}
