import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import BarcodeModal from '../components/BarcodeModal.jsx';
import { useLive } from '../hooks/useLive.js';

export default function ProductView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [sales, setSales] = useState({ units: 0, revenue: 0, orders: [] });
  const [hero, setHero] = useState(0);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/admin/products/${id}`);
      setProduct(data.product);
      setSales(data.sales || { units: 0, revenue: 0, orders: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Product not found');
    }
  };

  useLive(load, 5000);
  useEffect(() => {
    load();
  }, [id]);

  const duplicate = async () => {
    const { data } = await api.post(`/admin/products/${id}/duplicate`);
    navigate(`/products/${data.product._id}/edit`);
  };

  if (error) return <p className="field-error">{error}</p>;
  if (!product) return <p>Loading product…</p>;

  const images = product.images?.length ? product.images : [''] ;
  const status = product.displayStatus || product.status;

  return (
    <>
      <div className="page-head">
        <h1>{product.name}</h1>
        <Link className="btn" to={`/products/${product._id}/edit`}>
          Edit
        </Link>
        <button className="btn ghost" type="button" onClick={() => setBarcodeOpen(true)}>
          Generate barcode
        </button>
        <button className="btn ghost" type="button" onClick={duplicate}>
          Duplicate
        </button>
      </div>
      <div className="split wide" style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          {images[0] ? <img src={images[hero] || images[0]} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} /> : <p className="muted">No images yet.</p>}
          <div className="gallery-list" style={{ marginTop: 10 }}>
            {product.images?.map((src, i) => (
              <button key={src} type="button" className={`gallery-item ${i === hero ? 'is-primary' : ''}`} onClick={() => setHero(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <p>
            <span className={`badge ${status}`}>{String(status).replace(/_/g, ' ')}</span>
          </p>
          <p>{product.description || 'No description.'}</p>
          <p>
            <strong>Category</strong> {product.category?.name || '—'} {product.subcategory ? `· ${product.subcategory}` : ''}
          </p>
          <p>
            <strong>Total stock</strong> {product.stock} · <strong>Price</strong>{' '}
            {product.priceMin === product.priceMax ? money(product.priceMin) : `${money(product.priceMin)} – ${money(product.priceMax)}`}
          </p>
          <p>
            <strong>Sales</strong> {sales.units} units · {money(sales.revenue)}
          </p>
          <h3>Suppliers</h3>
          {(product.suppliers || []).length === 0 ? <p className="muted">No suppliers linked.</p> : null}
          {(product.suppliers || []).map((s) => (
            <p key={s._id}>
              {s.name} <span className={`badge ${s.status}`}>{s.status}</span>
              <span className="muted"> · {s.contactName || s.phone || ''}</span>
            </p>
          ))}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Variants</h2>
        <DataTable
          rows={product.variants || []}
          searchKeys={['sku', 'size', 'color', 'barcode']}
          searchPlaceholder="SKU, size, colour"
          columns={[
            { id: 'sku', header: 'SKU', accessor: (v) => v.sku },
            { id: 'size', header: 'Size', accessor: (v) => v.size },
            { id: 'color', header: 'Colour', accessor: (v) => v.color },
            { id: 'stock', header: 'Stock', accessor: (v) => v.stock },
            { id: 'price', header: 'Price', accessor: (v) => v.price, cell: (v) => money(v.price) },
            { id: 'costPrice', header: 'Cost', accessor: (v) => v.costPrice, cell: (v) => money(v.costPrice) },
            { id: 'barcode', header: 'Barcode', accessor: (v) => v.barcode || v.sku }
          ]}
        />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Sales history</h2>
        <DataTable
          rows={sales.orders || []}
          searchKeys={['orderNumber', 'channel']}
          empty="No paid sales for this product yet."
          columns={[
            {
              id: 'orderNumber',
              header: 'Order',
              accessor: (o) => o.orderNumber,
              cell: (o) => <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
            },
            { id: 'channel', header: 'Channel', accessor: (o) => o.channel },
            { id: 'total', header: 'Total', accessor: (o) => o.total, cell: (o) => money(o.total) },
            {
              id: 'paidAt',
              header: 'Date',
              accessor: (o) => o.paidAt || o.createdAt,
              cell: (o) => new Date(o.paidAt || o.createdAt).toLocaleString()
            }
          ]}
        />
      </div>
      {barcodeOpen ? <BarcodeModal product={product} onClose={() => setBarcodeOpen(false)} /> : null}
    </>
  );
}
