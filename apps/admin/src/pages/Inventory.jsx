import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STOCK_STATUSES } from '@khalyx/shared';
import { DataTable, Skeleton } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';
import AdjustStockModal from '../components/AdjustStockModal.jsx';
import { useLive } from '../hooks/useLive.js';

function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ');
}

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const supplier = params.get('supplier') || '';
  const [cats, setCats] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ productCount: 0, stockValue: 0, lowCount: 0, outCount: 0 });
  const [stockValue, setStockValue] = useState(0);
  const [valueByCategory, setValueByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustFor, setAdjustFor] = useState(null);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const load = async () => {
    const { data } = await api.get('/admin/inventory', {
      params: {
        q: q || undefined,
        category: category || undefined,
        status: status || undefined,
        supplier: supplier || undefined
      }
    });
    setItems(data.items || []);
    setTotals(data.totals || { productCount: 0, stockValue: 0, lowCount: 0, outCount: 0 });
    setStockValue(data.stockValue || 0);
    setValueByCategory(data.valueByCategory || []);
    setLoading(false);
  };

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(data.categories || []));
    api.get('/admin/products/meta/suppliers').then(({ data }) => setSuppliers(data.suppliers || [])).catch(() => {});
  }, []);

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [q, category, status, supplier]);

  return (
    <>
      <div className="page-head">
        <h1>Inventory</h1>
        <p className="muted">One row per product. Stock is live with POS, purchase orders, and the storefront.</p>
      </div>
      {loading && !items.length ? <Skeleton rows={8} /> : null}
      <section className="stats">
        <article className="stat">
          <span>Inventory value</span>
          <strong>{money(stockValue)}</strong>
          <p className="muted">{status || category || supplier ? 'Filtered at cost' : 'All products at cost'}</p>
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
      {valueByCategory.length > 1 ? (
        <p className="muted" style={{ marginTop: -8 }}>
          By category:{' '}
          {valueByCategory.map((row, i) => (
            <span key={row.category}>
              {i ? ' · ' : ''}
              {row.category} {money(row.value)}
            </span>
          ))}
        </p>
      ) : null}
      <DataTable
        rows={items}
        searchValue={q}
        onSearchChange={(value) => setFilter('q', value)}
        searchPlaceholder="Name, SKU, or barcode"
        searchLabel="Search"
        empty="No products match these inventory filters."
        rowClassName={(row) => (row.stockStatus === 'out_of_stock' ? 'is-urgent' : row.stockStatus === 'low_stock' ? 'is-pending' : '')}
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
            <Field label="Supplier">
              <select value={supplier} onChange={(e) => setFilter('supplier', e.target.value)}>
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        }
        columns={[
          {
            id: 'image',
            header: 'Image',
            sortable: false,
            cell: (row) => (row.image ? <img className="thumb" src={row.image} alt="" /> : '—')
          },
          {
            id: 'name',
            header: 'Product',
            accessor: (row) => row.name,
            cell: (row) => (
              <>
                <Link to={`/inventory/${row._id}`}>{row.name}</Link>
                <div className="muted">{row.variantCount} variant{row.variantCount === 1 ? '' : 's'}</div>
              </>
            )
          },
          { id: 'category', header: 'Category', accessor: (row) => row.category || '—' },
          {
            id: 'totalStock',
            header: 'Total stock',
            accessor: (row) => row.totalStock,
            cell: (row) => (
              <>
                {row.totalStock}
                {row.reserved ? <div className="muted">{row.reserved} reserved</div> : null}
              </>
            )
          },
          {
            id: 'stockStatus',
            header: 'Status',
            accessor: (row) => row.stockStatus,
            cell: (row) => <span className={`badge ${row.stockStatus}`}>{statusLabel(row.stockStatus)}</span>
          },
          {
            id: 'stockValue',
            header: 'Value',
            accessor: (row) => row.stockValue,
            cell: (row) => money(row.stockValue)
          },
          {
            id: 'updatedAt',
            header: 'Last updated',
            accessor: (row) => row.updatedAt,
            cell: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—')
          },
          {
            id: 'actions',
            header: 'Actions',
            sortable: false,
            cell: (row) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Link className="btn small ghost" to={`/inventory/${row._id}`}>
                  View
                </Link>
                <button className="btn small ghost" type="button" onClick={() => setAdjustFor(row)}>
                  Adjust stock
                </button>
              </div>
            )
          }
        ]}
      />
      {adjustFor ? (
        <AdjustStockModal
          productId={adjustFor._id}
          onClose={() => setAdjustFor(null)}
          onSaved={load}
        />
      ) : null}
    </>
  );
}
