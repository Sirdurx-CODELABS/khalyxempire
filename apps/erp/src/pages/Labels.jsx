import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api } from '../api/client.js';
import { BarcodeSticker } from '../components/BarcodeSticker.jsx';
import Field from '../components/Field.jsx';

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
        <button
          className="btn"
          type="button"
          disabled={!active?.labels?.length}
          onClick={async () => {
            window.print();
            if (active?.id) await api.patch(`/erp/labels/${active.id}/printed`).catch(() => {});
          }}
        >
          Print
        </button>
      </div>
      {error ? <p className="alert no-print">{error}</p> : null}
      <div className="toolbar no-print">
        <Field label="Search sheets">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={() => loadBatches(q)}>
          Load
        </button>
      </div>
      <div className="no-print">
        <DataTable
          rows={batches}
          rowKey={(b) => b.id}
          searchKeys={['name']}
          empty="No label sheets yet. Create them in Admin → Barcode labels."
          columns={[
            { id: 'name', header: 'Sheet', accessor: (b) => b.name, cell: (b) => <strong>{b.name}</strong> },
            { id: 'stickerCount', header: 'Stickers', accessor: (b) => b.stickerCount },
            {
              id: 'createdAt',
              header: 'Created',
              accessor: (b) => b.createdAt,
              cell: (b) => new Date(b.createdAt).toLocaleString()
            },
            {
              id: 'actions',
              header: 'Actions',
              sortable: false,
              cell: (b) => (
                <button className={`btn small ${active?.id === b.id ? '' : 'ghost'}`} type="button" onClick={() => openBatch(b.id)}>
                  {active?.id === b.id ? 'Loaded' : 'Open'}
                </button>
              )
            }
          ]}
        />
      </div>
      {active ? (
        <p className="muted no-print">
          Loaded from admin: {active.name}
        </p>
      ) : null}
      <div className={`labels size-${active?.labelSize || '50x30'}`}>
        {(active?.labels || []).map((item, index) => (
          <BarcodeSticker key={`${item.variantId}-${item.copyIndex || index}`} item={item} />
        ))}
      </div>
    </>
  );
}
