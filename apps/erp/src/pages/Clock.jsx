import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Clock() {
  const [data, setData] = useState({ open: null, recent: [] });
  const [who, setWho] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    const me = await api.get('/erp/clock/me');
    const on = await api.get('/erp/clock/who');
    setData(me.data);
    setWho(on.data.onShift);
  };

  useEffect(() => {
    load();
  }, []);

  const clockIn = async () => {
    setError('');
    try {
      await api.post('/erp/clock/in', { location: 'flagship' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not clock in');
    }
  };

  const clockOut = async () => {
    setError('');
    try {
      await api.post('/erp/clock/out');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not clock out');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Staff clock</h1>
        {data.open ? (
          <button className="btn danger" type="button" onClick={clockOut}>
            Clock out
          </button>
        ) : (
          <button className="btn" type="button" onClick={clockIn}>
            Clock in
          </button>
        )}
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <p>{data.open ? `On shift since ${new Date(data.open.clockIn).toLocaleString()}` : 'You are off shift.'}</p>
      <h2>On the floor</h2>
      <ul>
        {who.map((e) => (
          <li key={e._id}>
            {e.user?.name} · {e.location} · {new Date(e.clockIn).toLocaleTimeString()}
          </li>
        ))}
      </ul>
      <h2>Your recent shifts</h2>
      <table className="data">
        <thead>
          <tr>
            <th>In</th>
            <th>Out</th>
          </tr>
        </thead>
        <tbody>
          {data.recent.map((e) => (
            <tr key={e._id}>
              <td>{new Date(e.clockIn).toLocaleString()}</td>
              <td>{e.clockOut ? new Date(e.clockOut).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
