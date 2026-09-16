import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';

export default function Reconciliation() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);

  const load = async () => {
    const start = mode === 'weekly' ? weekAgo : from;
    const { data } = await api.get('/erp/reports/reconciliation', { params: { from: start, to } });
    setSummary(data.summary);
    const sales = await api.get('/erp/reports/staff-sales', { params: { from: start } });
    setStaff(sales.data.rows);
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
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <table className="data">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Sales</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((r) => (
                <tr key={r.staffId || r.name}>
                  <td>{r.name}</td>
                  <td>{r.orders}</td>
                  <td>{money(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
}
