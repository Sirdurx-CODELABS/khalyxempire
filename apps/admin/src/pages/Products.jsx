import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Products() {
  const [q, setQ] = useState('');
  const [data, setData] = useState({ products: [], total: 0 });

  const load = (term = q) => api.get('/admin/products', { params: { q: term } }).then(({ data: d }) => setData(d));

  useEffect(() => {
    const handle = setTimeout(() => {
      load(q);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Products</h1>
        <Link className="btn" to="/products/new">
          Add product
        </Link>
      </div>
      <div className="toolbar">
        <Field label="Search products">
          <input placeholder="Name, SKU, or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={() => load()}>
          Search
        </button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th></th>
            <th>Product</th>
            <th>Category</th>
            <th>Variants</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((p) => (
            <tr key={p._id}>
              <td>{p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" /> : null}</td>
              <td>
                <strong>{p.name}</strong>
                <div className="muted">{p.slug}</div>
                {p.featured ? <span className="badge">Featured</span> : null}
              </td>
              <td>{p.category?.name}</td>
              <td>{p.variants?.length}</td>
              <td>{p.variants?.reduce((s, v) => s + (v.stock || 0), 0)}</td>
              <td>
                <Link className="btn small ghost" to={`/products/${p._id}`}>
                  Edit
                </Link>{' '}
                <button className="btn small danger" type="button" onClick={() => remove(p._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
