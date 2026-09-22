import { useEffect, useMemo, useState } from 'react';
import { STOCK_ADJUST_REASONS } from '@khalyx/shared';
import Field from './Field.jsx';
import { api } from '../api/client.js';

export default function AdjustStockModal({ productId, variantId, onClose, onSaved }) {
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(String(variantId || ''));
  const [reason, setReason] = useState('received');
  const [qty, setQty] = useState('1');
  const [direction, setDirection] = useState('add');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/admin/inventory/${productId}`)
      .then(({ data }) => {
        setProduct(data.product);
        const variants = data.product?.variants || [];
        setVariant((current) => current || String(variants[0]?._id || ''));
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load product'));
  }, [productId]);

  const meta = useMemo(() => STOCK_ADJUST_REASONS.find((r) => r.id === reason), [reason]);
  const locked = meta?.direction && meta.direction !== 'either';
  const effectiveDirection = locked ? meta.direction : direction;

  const submit = async (e) => {
    e.preventDefault();
    const amount = Math.abs(Number(qty) || 0);
    if (!variant) {
      setError('Select a variant');
      return;
    }
    if (!amount) {
      setError('Enter a quantity');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/admin/inventory/adjust', {
        productId,
        variantId: variant,
        qty: effectiveDirection === 'remove' ? -amount : amount,
        reason,
        note
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not adjust stock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal panel" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Adjust stock</h2>
        <p className="muted">{product?.name || 'Loading product…'}</p>
        {error ? <p className="alert">{error}</p> : null}
        <Field label="Variant" required>
          <select value={variant} onChange={(e) => setVariant(e.target.value)} required>
            <option value="">Select variant</option>
            {(product?.variants || []).map((v) => (
              <option key={v._id} value={v._id}>
                {v.size || 'OS'} {v.color || ''} · {v.sku} · {v.stock} in stock
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason" required>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              const next = STOCK_ADJUST_REASONS.find((r) => r.id === e.target.value);
              if (next?.direction === 'add' || next?.direction === 'remove') setDirection(next.direction);
            }}
            required
          >
            {STOCK_ADJUST_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Direction" required>
          <select value={effectiveDirection} onChange={(e) => setDirection(e.target.value)} disabled={locked}>
            <option value="add">Add stock</option>
            <option value="remove">Remove stock</option>
          </select>
        </Field>
        <Field label="Quantity" required>
          <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>
        <Field label="Note" hint="Optional extra detail for the audit log">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. carton 4, shelf check" />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" type="submit" disabled={busy || !product}>
            {busy ? 'Saving…' : 'Save adjustment'}
          </button>
          <button className="btn ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
