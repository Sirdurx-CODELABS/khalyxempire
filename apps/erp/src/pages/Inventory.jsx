import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STOCK_STATUSES } from '@khalyx/shared';
import { DataTable, Skeleton } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import { useLive } from '../hooks/useLive.js';

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ productCount: 0, stockValue: 0, lowCount: 0, outCount: 0 });
  const [stockValue, setStockValue] = useState(0);
  const [loading, setLoading] = useState(true);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const load = async () => {
    const { data } = await api.get('/erp/inventory', {
      params: { q: q || undefined, category: category || undefined, status: status || undefined }
    });
    setItems(data.items || []);
    setTotals(data.totals || { productCount: 0, stockValue: 0, lowCount: 0, outCount: 0 });
    setStockValue(data.stockValue || 0);
    setLoading(false);
  };

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(data.categories || []));
  }, []);

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [q, category, status]);

  return (
    <>
      <div className="page-head">
        <h1>Inventory</h1>
        <p className="muted">Live stock for the floor — same catalog as Admin and POS.</p>
      </div>
      {loading && !items.length ? <Skeleton rows={8} /> : null}
      <section className="stats">
        <article className="stat">
          <span>Inventory value</span>
          <strong>{money(stockValue)}</strong>
        </article>
        <article className="stat">
          <span>Products</span>
          <strong>{totals.productCount}</strong>
        </article>
        <Link className="stat metric-link" to="/inventory?status=low">
          <span>Low stock</span>
          <strong>{totals.lowCount}</strong>
        </Link>
        <Link className="stat metric-link" to="/inventory?status=out">
          <span>Out of stock</span>
          <strong>{totals.outCount}</strong>
        </Link>
      </section>
      <DataTable
        rows={items}
        searchValue={q}
        onSearchChange={(value) => setFilter('q', value)}
        searchPlaceholder="Name, SKU, or barcode"
        empty="No products match these filters."
        filters={
          <>
            <Field label="Category">
              <select value={category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">All categories</option>
                {cats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stock status">
              <select value={status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {STOCK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id === 'low_stock' ? 'low' : s.id === 'out_of_stock' ? 'out' : 'in'}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        }
        columns={[
          {
            id: 'name',
            header: 'Product',
            accessor: (row) => row.name,
            cell: (row) => <Link to={`/inventory/${row._id}`}>{row.name}</Link>
          },
          { id: 'category', header: 'Category', accessor: (row) => row.category || '—' },
          { id: 'stock', header: 'Stock', accessor: (row) => row.totalStock },
          {
            id: 'status',
            header: 'Status',
            accessor: (row) => row.stockStatus,
            cell: (row) => <span className={`badge ${row.stockStatus}`}>{String(row.stockStatus || '').replace(/_/g, ' ')}</span>
          },
          {
            id: 'value',
            header: 'Value',
            accessor: (row) => row.stockValue,
            cell: (row) => money(row.stockValue)
          }
        ]}
      />
    </>
  );
}
