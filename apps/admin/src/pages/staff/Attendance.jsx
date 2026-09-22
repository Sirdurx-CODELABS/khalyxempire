import { useEffect, useState } from 'react';
import { api, downloadFile } from '../../api/client.js';
import Field from '../../components/Field.jsx';
import { STATUS_LABELS, monthAgo, today } from './labels.js';
import { EmptyState, Skeleton } from '@khalyx/ui';

export default function Attendance() {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [staff, setStaff] = useState('');
  const [users, setUsers] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return api
      .get('/admin/staff/attendance', { params: { from, to, staff: staff || undefined } })
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.response?.data?.message || 'Could not load attendance. Try again.'));
  };

  useEffect(() => {
    api.get('/admin/staff').then(({ data: d }) => setUsers(d.users || []));
    load();
  }, []);

  if (error && !data) {
    return (
      <EmptyState
        title="Attendance could not load"
        body={error}
        action={
          <button className="btn" type="button" onClick={load}>
            Retry
          </button>
        }
      />
    );
  }
  if (!data) return <Skeleton rows={6} />;

  return (
    <>
      <div className="toolbar no-print">
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Staff">
          <select value={staff} onChange={(e) => setStaff(e.target.value)}>
            <option value="">All staff</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Run
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => downloadFile('/admin/staff/attendance/export', 'khalyx-attendance.csv', { from, to, staff: staff || undefined })}
        >
          Export CSV
        </button>
        <button className="btn ghost" type="button" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {(data.staff || []).length === 0 ? (
        <EmptyState title="No attendance rows" body="No staff records in this date range." />
      ) : null}
      {(data.staff || []).map((person) => (
        <div className="panel" key={person.userId} style={{ marginBottom: 16 }}>
          <div className="page-head" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{person.name}</h3>
            <p className="muted">
              {person.summary.hours}h · {person.summary.present} present · {person.summary.absent} absent · {person.summary.late}{' '}
              late · {person.summary.attendanceRate}% attendance
            </p>
          </div>
          <div className="att-grid">
            {person.days.map((day) => (
              <div key={day.date} className={`att-cell ${day.status}`} title={`${day.date} ${day.shift?.name || ''}`}>
                <span>{day.date.slice(8)}</span>
                <strong>{STATUS_LABELS[day.status] || day.status}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
