import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function Clock() {
  const [data, setData] = useState({ open: null, recent: [] });
  const [who, setWho] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const me = await api.get('/erp/clock/me');
    const on = await api.get('/erp/clock/who');
    const hours = await api.get('/erp/clock/summary');
    setData(me.data);
    setWho(on.data.onShift);
    setSummary(hours.data);
  };

  useEffect(() => {
    load();
  }, []);

  const body = pin ? { pin } : {};
  const run = async (fn) => {
    setError('');
    setNotice('');
    try {
      const res = await fn();
      if (res?.data?.late) setNotice(`Clocked in late for ${res.data.shiftName || 'the assigned shift'}`);
      setPin('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Clock action failed');
    }
  };

  const onBreak = (data.open?.breaks || []).some((b) => !b.end);

  return (
    <>
      <div className="page-head">
        <h1>Staff clock</h1>
        <div>
          {data.open ? (
            <>
              {onBreak ? (
                <button className="btn ghost" type="button" onClick={() => run(() => api.post('/erp/clock/break/end', body))}>
                  End break
                </button>
              ) : (
                <button className="btn ghost" type="button" onClick={() => run(() => api.post('/erp/clock/break/start', body))}>
                  Start break
                </button>
              )}{' '}
              <button className="btn danger" type="button" onClick={() => run(() => api.post('/erp/clock/out', body))}>
                Clock out
              </button>
            </>
          ) : (
            <button className="btn" type="button" onClick={() => run(() => api.post('/erp/clock/in', { ...body, location: 'flagship' }))}>
              Clock in
            </button>
          )}
        </div>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {notice ? <p className="ok">{notice}</p> : null}
      <p>
        {data.open
          ? `On shift since ${new Date(data.open.clockIn).toLocaleString()}${data.open.late ? ' · late' : ''}${onBreak ? ' · on break' : ''}${
              data.open.shiftName ? ` · ${data.open.shiftName}` : ''
            }`
          : 'You are off shift.'}
      </p>
      <Field label="PIN or staff ID (optional — clocks this person)">
        <input value={pin} onChange={(e) => setPin(e.target.value)} style={{ maxWidth: 160 }} />
      </Field>
      {summary ? (
        <p>
          This week: <strong>{summary.hours}h</strong> · shift sales {summary.sales?.orders || 0} · ₦
          {Number(summary.sales?.revenue || 0).toLocaleString('en-NG')}
        </p>
      ) : null}
      <h2>On the floor</h2>
      <ul>
        {who.map((e) => (
          <li key={e._id}>
            {e.user?.name} · {e.user?.staffTitle || e.user?.role} · {e.location} · {new Date(e.clockIn).toLocaleTimeString()}
          </li>
        ))}
      </ul>
      <h2>Your recent shifts</h2>
      <DataTable
        rows={data.recent || []}
        searchPlaceholder="Search shifts"
        columns={[
          { id: 'clockIn', header: 'In', accessor: (e) => new Date(e.clockIn).toLocaleString() },
          { id: 'clockOut', header: 'Out', accessor: (e) => (e.clockOut ? new Date(e.clockOut).toLocaleString() : '—') },
          { id: 'hours', header: 'Hours', accessor: (e) => Number(e.hours || 0), cell: (e) => (e.hours || 0).toFixed?.(2) || e.hours || '—' }
        ]}
      />
    </>
  );
}
