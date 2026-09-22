import { useMemo, useState } from 'react';
import { api, money } from '../api/client.js';
import { BarcodeSticker } from './BarcodeSticker.jsx';
import Field from './Field.jsx';

export default function BarcodeModal({ product, onClose }) {
  const variants = product?.variants || [];
  const [selected, setSelected] = useState(() => variants.map((v) => String(v._id)));
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState('50x30');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [printItems, setPrintItems] = useState([]);

  const items = useMemo(
    () =>
      variants
        .filter((v) => selected.includes(String(v._id)))
        .flatMap((v) =>
          Array.from({ length: Math.max(1, Number(copies) || 1) }, (_, i) => ({
            ...v,
            name: product.name,
            barcode: v.barcode || v.sku,
            key: `${v._id}-${i}`
          }))
        ),
    [variants, selected, copies, product]
  );

  const toggle = (id) => {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const queue = async () => {
    setError('');
    try {
      await api.post(`/admin/products/${product._id}/labels`, {
        variantIds: selected,
        copies,
        labelSize,
        name: `${product.name} barcodes`
      });
      setMessage('Queued for Labels. Print anytime from the Labels module.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not queue labels');
    }
  };

  const printNow = () => {
    if (!items.length) return;
    setPrintItems(items);
    setTimeout(() => window.print(), 50);
  };

  if (!product) return null;

  return (
    <>
      <div className="modal-backdrop no-print" onClick={onClose}>
        <div className="modal panel" onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 100%)' }}>
          <h2>Generate barcode</h2>
          <p className="muted">{product.name} — choose variants, then print now or queue for the Labels module.</p>
          {error ? <p className="field-error">{error}</p> : null}
          {message ? <p className="ok">{message}</p> : null}
          <div className="multi-select" style={{ margin: '12px 0' }}>
            <label>
              <input
                type="checkbox"
                checked={selected.length === variants.length}
                onChange={(e) => setSelected(e.target.checked ? variants.map((v) => String(v._id)) : [])}
              />{' '}
              All variants
            </label>
            {variants.map((v) => (
              <label key={v._id}>
                <input type="checkbox" checked={selected.includes(String(v._id))} onChange={() => toggle(String(v._id))} />{' '}
                {v.size} {v.color} · {v.sku} · {money(v.price)}
              </label>
            ))}
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Copies per variant" required>
              <input type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} />
            </Field>
            <Field label="Label size">
              <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
                <option value="50x25">50 × 25 mm</option>
                <option value="50x30">50 × 30 mm</option>
                <option value="58x40">58 × 40 mm</option>
                <option value="80x50">80 × 50 mm</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn" type="button" disabled={!selected.length} onClick={printNow}>
              Print now
            </button>
            <button className="btn ghost" type="button" disabled={!selected.length} onClick={queue}>
              Queue for later
            </button>
            <button className="btn ghost" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      {printItems.length ? (
        <div className={`labels size-${labelSize} print-only`}>
          {printItems.map((item) => (
            <BarcodeSticker key={item.key} item={item} />
          ))}
        </div>
      ) : null}
    </>
  );
}
