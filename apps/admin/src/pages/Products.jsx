import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, EmptyState } from '@khalyx/ui';
import { api, downloadFile, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import BarcodeModal from '../components/BarcodeModal.jsx';
import { useLive } from '../hooks/useLive.js';

function statusOf(p) {
  return p.displayStatus || p.status || (p.isActive ? 'active' : 'draft');
}

export default function Products() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [supplier, setSupplier] = useState('');
  const [flag, setFlag] = useState('');
  const [cats, setCats] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [barcodeFor, setBarcodeFor] = useState(null);

  const load = async () => {
    const { data } = await api.get('/admin/products', {
      params: {
        q,
        category: category || undefined,
        status: status || undefined,
        supplier: supplier || undefined,
        newArrival: flag === 'newArrival' ? 'true' : undefined,
        featured: flag === 'featured' ? 'true' : undefined,
        limit: 200
      }
    });
    setProducts(data.products || []);
  };

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(data.categories || []));
    api.get('/admin/products/meta/suppliers').then(({ data }) => setSuppliers(data.suppliers || [])).catch(() => {});
  }, []);

  useLive(load, 5000);

  useEffect(() => {
    load();
  }, [q, category, status, supplier, flag]);

  const remove = async (id) => {
    if (!confirm('Delete this product from Admin, ERP, and the storefront?')) return;
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
        <button className="btn ghost" type="button" onClick={() => downloadFile('/admin/products/export/csv', 'khalyx-products.csv')}>
          Export CSV
        </button>
        <label className="btn ghost">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const text = await file.text();
              const lines = text.trim().split(/\r?\n/).filter(Boolean);
              if (lines.length < 2) return;
              const keys = lines[0].split(',').map((k) => k.trim().replace(/^"|"$/g, ''));
              const rows = lines.slice(1).map((line) => {
                const vals = line.split(',');
                return Object.fromEntries(keys.map((k, i) => [k, (vals[i] || '').trim().replace(/^"|"$/g, '')]));
              });
              await api.post('/admin/products/import/csv', { rows });
              load();
            }}
          />
        </label>
      </div>
      <p className="muted" style={{ marginTop: -4 }}>
        Shared catalog for Admin, ERP, and the online storefront. Tick <strong>New arrival</strong> on a product to show it in the
        storefront hero.
      </p>
      {!q && !category && !status && !supplier && !flag && !products.length ? (
        <EmptyState
          title="No products yet"
          body="Add your first product to stock the storefront and POS."
          action={
            <Link className="btn" to="/products/new">
              Add product
            </Link>
          }
        />
      ) : (
      <DataTable
        rows={products}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Name or SKU"
        searchLabel="Search"
        empty="No products match these filters."
        filters={
          <>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {cats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </Field>
            <Field label="Supplier">
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Flags">
              <select value={flag} onChange={(e) => setFlag(e.target.value)}>
                <option value="">All products</option>
                <option value="newArrival">New arrivals (hero)</option>
                <option value="featured">Featured</option>
              </select>
            </Field>
          </>
        }
        columns={[
          {
            id: 'image',
            header: 'Image',
            sortable: false,
            cell: (p) => (p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" /> : '—')
          },
          {
            id: 'name',
            header: 'Name',
            accessor: (p) => p.name,
            cell: (p) => (
              <>
                <Link to={`/products/${p._id}`}>{p.name}</Link>
                <div className="muted">{p.slug}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {p.newArrival ? <span className="badge paid">New arrival</span> : null}
                  {p.featured ? <span className="badge approved">Featured</span> : null}
                </div>
              </>
            )
          },
          { id: 'category', header: 'Category', accessor: (p) => p.category?.name || '' },
          {
            id: 'stock',
            header: 'Stock',
            accessor: (p) => p.stock,
            cell: (p) => p.stock
          },
          {
            id: 'price',
            header: 'Price',
            accessor: (p) => p.priceMin,
            cell: (p) => (p.priceMin === p.priceMax ? money(p.priceMin) : `${money(p.priceMin)} – ${money(p.priceMax)}`)
          },
          {
            id: 'status',
            header: 'Status',
            accessor: (p) => statusOf(p),
            cell: (p) => <span className={`badge ${statusOf(p)}`}>{String(statusOf(p)).replace(/_/g, ' ')}</span>
          },
          {
            id: 'createdAt',
            header: 'Added',
            accessor: (p) => p.createdAt,
            cell: (p) => (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—')
          },
          {
            id: 'actions',
            header: 'Actions',
            sortable: false,
            cell: (p) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Link className="btn small ghost" to={`/products/${p._id}`}>
                  View
                </Link>
                <Link className="btn small ghost" to={`/products/${p._id}/edit`}>
                  Edit
                </Link>
                <button className="btn small ghost" type="button" onClick={() => setBarcodeFor(p)}>
                  Barcode
                </button>
                <button className="btn small danger" type="button" onClick={() => remove(p._id)}>
                  Delete
                </button>
              </div>
            )
          }
        ]}
      />
      )}
      {barcodeFor ? <BarcodeModal product={barcodeFor} onClose={() => setBarcodeFor(null)} /> : null}
    </>
  );
}
