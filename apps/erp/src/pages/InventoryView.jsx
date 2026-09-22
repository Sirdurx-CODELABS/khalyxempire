import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { useLive } from '../hooks/useLive.js';

export default function InventoryView() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);

  const load = () => api.get(`/erp/inventory/${id}`).then(({ data }) => setDetail(data));

  useLive(load, 5000);
  useEffect(() => {
    load().catch(() => setDetail(null));
  }, [id]);

  if (!detail?.product) return <p>Loading…</p>;
  const product = detail.product;
  const variants = product.variants || [];

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/inventory" className="muted">
            ← Inventory
          </Link>
          <h1>{product.name}</h1>
        </div>
      </div>
      <div className="panel">
        <p className="muted">
          {product.category?.name || 'Uncategorized'} · Stock value {money(product.stockValue || 0)}
        </p>
        <DataTable
          rows={variants}
          rowKey={(v) => v._id || v.sku}
          columns={[
            { id: 'sku', header: 'SKU', accessor: (v) => v.sku },
            { id: 'size', header: 'Size', accessor: (v) => v.size },
            { id: 'color', header: 'Color', accessor: (v) => v.color },
            { id: 'stock', header: 'Stock', accessor: (v) => v.stock },
            {
              id: 'price',
              header: 'Price',
              accessor: (v) => v.price,
              cell: (v) => money(v.price)
            }
          ]}
        />
      </div>
    </>
  );
}
