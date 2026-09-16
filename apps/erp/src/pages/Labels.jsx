import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { BarcodeSticker } from '../components/BarcodeSticker.jsx';

export default function Labels() {
  const [q, setQ] = useState('');
  const [batches, setBatches] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');

  const loadBatches = async (term = q) => {
    try {
      const { data } = await api.get('/erp/labels', { params: { q: term } });
      setBatches(data.batches || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load labels from admin');
    }
  };

  useEffect(() => {
    loadBatches('');
  }, []);

  const openBatch = async (id) => {
    const { data } = await api.get(`/erp/labels/${id}`);
    setActive(data.batch);
  };

  return (
    <>
      <div className="page-head no-print">
        <h1>Barcode labels</h1>
        <button className="btn" type="button" disabled={!active?.labels?.length} onClick={() => window.print()}>
          Print
        </button>
      </div>
      {error ? <p className="alert no-print">{error}</p> : null}
      <div className="toolbar no-print">
        <input placeholder="Search sheets saved in admin" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" type="button" onClick={() => loadBatches(q)}>
          Load
        </button>
      </div>
      <div className="no-print" style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {batches.length === 0 ? <p className="muted">No label sheets yet. Create them in Admin → Barcode labels.</p> : null}
        {batches.map((batch) => (
          <button
            key={batch.id}
            className="hit"
            type="button"
            onClick={() => openBatch(batch.id)}
            style={{ borderColor: active?.id === batch.id ? 'var(--gold)' : undefined }}
          >
            <span>
              <strong>{batch.name}</strong>
              <div className="muted">
                {batch.stickerCount} stickers · {new Date(batch.createdAt).toLocaleString()}
              </div>
            </span>
          </button>
        ))}
      </div>
      {active ? (
        <p className="muted no-print">
          Loaded from admin: {active.name}
        </p>
      ) : null}
      <div className="labels">
        {(active?.labels || []).map((item, index) => (
          <BarcodeSticker key={`${item.variantId}-${item.copyIndex || index}`} item={item} />
        ))}
      </div>
    </>
  );
}
