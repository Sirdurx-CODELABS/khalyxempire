import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Reconciliation() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState('daily');
  const [counted, setCounted] = useState({ cash: '', card: '', transfer: '' });
  const [notes, setNotes] = useState('');
  const [closes, setCloses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);

  const load = async () => {
    const start = mode === 'weekly' ? weekAgo : from;
    const { data } = await api.get('/erp/reports/reconciliation', { params: { from: start, to } });
    setSummary(data.summary);
    setCloses(data.closes || []);
    const sales = await api.get('/erp/reports/staff-sales', { params: { from: start } });
    setStaff(sales.data.rows);
  };

  const closeDay = async () => {
    await api.post('/erp/reports/reconciliation', {
      date: from,
      countedCash: counted.cash,
      countedCard: counted.card,
      countedTransfer: counted.transfer,
      notes
    });
    setNotes('');
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Reconciliation</h1>
      </div>
      <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Field label="Mode">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Run
        </button>
      </div>
      {summary ? (
        <>
          <div className="pos">
            <article className="panel">
              <h2>POS</h2>
              <p>
                {summary.pos.orders} sales · {money(summary.pos.revenue)} · {summary.pos.units} units
              </p>
              <p>Cash {money(summary.pos.byMethod.cash)}</p>
              <p>Card {money(summary.pos.byMethod.card)}</p>
              <p>Transfer {money(summary.pos.byMethod.transfer)}</p>
            </article>
            <article className="panel">
              <h2>Count the till</h2>
              <Field label="Cash counted">
                <input type="number" value={counted.cash} onChange={(e) => setCounted({ ...counted, cash: e.target.value })} />
              </Field>
              <Field label="Card counted">
                <input type="number" value={counted.card} onChange={(e) => setCounted({ ...counted, card: e.target.value })} />
              </Field>
              <Field label="Transfer counted">
                <input type="number" value={counted.transfer} onChange={(e) => setCounted({ ...counted, transfer: e.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <button className="btn" type="button" onClick={closeDay}>
                Close day
              </button>
              {closes.map((c) => (
                <p key={c._id} className={c.discrepancy ? 'alert' : 'ok'}>
                  {c.staff?.name || 'Staff'} · counted {money(c.countedTotal)} vs expected {money(c.expectedTotal)} · gap{' '}
                  {money(c.discrepancy)}
                </p>
              ))}
            </article>
            <article className="panel">
              <h2>Online</h2>
              <p>
                {summary.online.orders} orders · {money(summary.online.revenue)}
              </p>
              <h2>Combined</h2>
              <p>
                {summary.combined.orders} · {money(summary.combined.revenue)}
              </p>
            </article>
          </div>
          <h2>By staff</h2>
          <DataTable
            rows={staff}
            rowKey={(r) => r.staffId || r.name}
            searchKeys={['name']}
            columns={[
              { id: 'name', header: 'Staff', accessor: (r) => r.name },
              { id: 'orders', header: 'Sales', accessor: (r) => r.orders },
              { id: 'revenue', header: 'Revenue', accessor: (r) => r.revenue, cell: (r) => money(r.revenue) }
            ]}
          />
        </>
      ) : null}
    </>
  );
}
