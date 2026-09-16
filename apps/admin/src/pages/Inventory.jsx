import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Inventory() {
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');

  const load = () =>
    api.get('/admin/inventory', { params: { q, low: low ? 'true' : undefined } }).then(({ data }) => setItems(data.items));

  useEffect(() => {
    load();
  }, []);

  const adjust = async (row, qty) => {
    await api.post('/admin/inventory/adjust', {
      productId: row.productId,
      variantId: row.variantId,
      qty,
      note: note || 'Admin adjustment'
    });
    setNote('');
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Inventory</h1>
      </div>
      <div className="toolbar">
        <Field label="Search inventory">
          <input placeholder="SKU, name, or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Low stock only
        </label>
        <Field label="Adjustment note">
          <input placeholder="Why stock changed" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Filter
        </button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Variant</th>
            <th>Stock</th>
            <th>Reserved</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.variantId}>
              <td>
                {row.name}
                <div className="muted">{row.category}</div>
              </td>
              <td>{row.sku}</td>
              <td>
                {row.size} {row.color}
              </td>
              <td>
                {row.stock} {row.low ? <span className="badge low">low</span> : null}
              </td>
              <td>{row.reserved}</td>
              <td>
                <button className="btn small ghost" type="button" onClick={() => adjust(row, 1)}>
                  +1
                </button>{' '}
                <button className="btn small ghost" type="button" onClick={() => adjust(row, -1)}>
                  −1
                </button>{' '}
                <button className="btn small ghost" type="button" onClick={() => adjust(row, 10)}>
                  +10
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
