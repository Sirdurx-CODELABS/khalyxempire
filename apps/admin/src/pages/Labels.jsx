import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import { BarcodeSticker } from '../components/BarcodeSticker.jsx';
import Field from '../components/Field.jsx';

export default function Labels() {
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [labelSize, setLabelSize] = useState('50x30');
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

  const hitRows = useMemo(
    () =>
      hits.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          id: variant._id,
          product,
          variant,
          productName: product.name,
          variantLabel: [variant.size, variant.color].filter(Boolean).join(' / ') || 'OS',
          price: variant.price,
          barcode: variant.barcode || variant.sku
        }))
      ),
    [hits]
  );

  const save = async () => {
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/admin/labels', {
        name: name || `Labels ${new Date().toLocaleDateString('en-NG')}`,
        labelSize,
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
              <input value={q} onChange={(e) => setQ(e.target.value)} />
            </Field>
          </div>
          <DataTable
            rows={hitRows}
            rowKey={(r) => r.id}
            searchKeys={['productName', 'barcode', 'variantLabel']}
            searchPlaceholder="Filter results"
            empty="Search above to add variants to this sheet."
            columns={[
              { id: 'productName', header: 'Product', accessor: (r) => r.productName, cell: (r) => <strong>{r.productName}</strong> },
              {
                id: 'variantLabel',
                header: 'Variant',
                accessor: (r) => r.variantLabel,
                cell: (r) => (
                  <>
                    {r.variantLabel} · {money(r.price)}
                  </>
                )
              },
              { id: 'barcode', header: 'Barcode', accessor: (r) => r.barcode },
              {
                id: 'actions',
                header: 'Actions',
                sortable: false,
                cell: (r) => (
                  <button className="btn small" type="button" onClick={() => addVariant(r.product, r.variant)}>
                    Add
                  </button>
                )
              }
            ]}
          />

          <h3>This sheet</h3>
          {draft.length === 0 ? <p className="muted">Add products to create barcodes for the shop floor.</p> : null}
          <DataTable
            rows={draft}
            rowKey={(r) => r.variantId}
            searchKeys={['name', 'sku', 'barcode']}
            empty="No items on this sheet yet."
            columns={[
              {
                id: 'name',
                header: 'Item',
                accessor: (r) => r.name,
                cell: (r) => (
                  <>
                    <strong>{r.name}</strong>
                    <div className="muted">
                      {r.sku} · {r.barcode}
                    </div>
                  </>
                )
              },
              {
                id: 'copies',
                header: 'Copies',
                accessor: (r) => r.copies,
                cell: (r) => (
                  <Field label="Copies">
                    <input type="number" min="1" value={r.copies} onChange={(e) => setCopies(r.variantId, Number(e.target.value))} style={{ width: 80 }} />
                  </Field>
                )
              },
              {
                id: 'actions',
                header: 'Actions',
                sortable: false,
                cell: (r) => (
                  <button className="btn small danger" type="button" onClick={() => setCopies(r.variantId, 0)}>
                    Remove
                  </button>
                )
              }
            ]}
          />
          <div className="toolbar">
            <Field label="Sheet name">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Label size">
              <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
                <option value="50x25">50 × 25 mm</option>
                <option value="50x30">50 × 30 mm</option>
                <option value="58x40">58 × 40 mm</option>
                <option value="80x50">80 × 50 mm</option>
              </select>
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

      <div className={`labels size-${labelSize}`}>
        {stickers.map((item, index) => (
          <BarcodeSticker key={item.key || `${item.variantId}-${item.copyIndex || index}`} item={item} />
        ))}
      </div>
    </>
  );
}
