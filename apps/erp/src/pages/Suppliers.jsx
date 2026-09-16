import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const blank = { name: '', contactName: '', email: '', phone: '', address: '', paymentTerms: 'Net 30' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(blank);

  const load = () => api.get('/erp/suppliers').then(({ data }) => setSuppliers(data.suppliers));

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post('/erp/suppliers', form);
    setForm(blank);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Suppliers</h1>
      </div>
      <div className="pos">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Terms</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>
                  {s.contactName}
                  <div className="muted">
                    {s.phone} {s.email}
                  </div>
                </td>
                <td>{s.paymentTerms}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="panel form-grid" onSubmit={save}>
          <h3>Add supplier</h3>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
          <button className="btn" type="submit">
            Save
          </button>
        </form>
      </div>
    </>
  );
}
