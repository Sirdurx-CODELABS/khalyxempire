import { useEffect, useMemo, useState } from 'react';
import { api, money } from '../api/client.js';
import { BarcodeSticker } from '../components/BarcodeSticker.jsx';
import Field from '../components/Field.jsx';

export default function Labels() {
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [hits, setHits] = useState([]);
  const [draft, setDraft] = useState([]);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBatches = () => api.get('/admin/labels').then(({ data }) => setBatches(data.batches || []));

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get('/admin/products', { params: { q: term, limit: 12 } });
      setHits(data.products || []);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  const addVariant = (product, variant) => {
    setDraft((rows) => {
      const existing = rows.find((r) => r.variantId === variant._id);
      if (existing) {
        return rows.map((r) => (r.variantId === variant._id ? { ...r, copies: r.copies + 1 } : r));
      }
      return [
        ...rows,
        {
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          sku: variant.sku,
          barcode: variant.barcode || variant.sku,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          copies: 1
        }
      ];
    });
    setMessage('');
    setError('');
  };

  const setCopies = (variantId, copies) => {
    setDraft((rows) => rows.map((r) => (r.variantId === variantId ? { ...r, copies: Math.max(1, copies) } : r)).filter((r) => r.copies > 0));
  };

  const preview = useMemo(
    () =>
      draft.flatMap((item) =>
        Array.from({ length: item.copies }, (_, i) => ({
          ...item,
          copyIndex: i + 1,
          key: `${item.variantId}-${i}`
        }))
      ),
    [draft]
  );

  const save = async () => {
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/admin/labels', {
        name: name || `Labels ${new Date().toLocaleDateString('en-NG')}`,
        selection: draft.map((row) => ({
          productId: row.productId,
          variantId: row.variantId,
          copies: row.copies
        }))
      });
      setMessage(`Saved “${data.batch.name}”. Store ERP can load this sheet now.`);
      setName('');
      loadBatches();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save labels');
    }
  };

  const openBatch = async (id) => {
    const { data } = await api.get(`/admin/labels/${id}`);
    setDraft(
      (data.batch.items || []).map((item) => ({
        ...item,
        productId: item.productId,
        variantId: item.variantId
      }))
    );
    setName(data.batch.name);
  };

  const stickers = preview;

  return (
    <>
      <div className="page-head no-print">
        <h1>Barcode labels</h1>
        <button className="btn" type="button" disabled={!stickers.length} onClick={() => window.print()}>
          Print
        </button>
      </div>
      {error ? <p className="alert no-print">{error}</p> : null}
      {message ? <p className="ok no-print">{message}</p> : null}

      <div className="split wide no-print" style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <div>
          <div className="toolbar">
            <Field label="Search products">
              <input placeholder="Name, SKU, or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
            </Field>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Barcode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {hits.flatMap((product) =>
                (product.variants || []).map((variant) => (
                  <tr key={variant._id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>
                      {[variant.size, variant.color].filter(Boolean).join(' / ') || 'OS'} · {money(variant.price)}
                    </td>
                    <td>{variant.barcode || variant.sku}</td>
                    <td>
                      <button className="btn small" type="button" onClick={() => addVariant(product, variant)}>
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3>This sheet</h3>
          {draft.length === 0 ? <p className="muted">Add products to create barcodes for the shop floor.</p> : null}
          <table className="data">
            <thead>
              <tr>
                <th>Item</th>
                <th>Copies</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.map((row) => (
                <tr key={row.variantId}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="muted">
                      {row.sku} · {row.barcode}
                    </div>
                  </td>
                  <td>
                    <Field label="Copies">
                      <input
                        type="number"
                        min="1"
                        value={row.copies}
                        onChange={(e) => setCopies(row.variantId, Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    </Field>
                  </td>
                  <td>
                    <button className="btn small danger" type="button" onClick={() => setCopies(row.variantId, 0)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar">
            <Field label="Sheet name">
              <input placeholder="e.g. Hoodie restock" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <button className="btn" type="button" disabled={!draft.length} onClick={save}>
              Save for stores
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Saved sheets</h3>
          <p className="muted">ERP loads these same sheets at the store.</p>
          {batches.map((batch) => (
            <button key={batch.id} className="hit" type="button" onClick={() => openBatch(batch.id)} style={{ width: '100%', marginBottom: 8 }}>
              <span>
                <strong>{batch.name}</strong>
                <div className="muted">
                  {batch.stickerCount} stickers · {new Date(batch.createdAt).toLocaleString()}
                </div>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="labels">
        {stickers.map((item, index) => (
          <BarcodeSticker key={item.key || `${item.variantId}-${item.copyIndex || index}`} item={item} />
        ))}
      </div>
    </>
  );
}
