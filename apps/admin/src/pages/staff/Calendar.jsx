import { useEffect, useState } from 'react';
import { WEEKDAYS } from '@khalyx/shared';
import { api } from '../../api/client.js';
import Field from '../../components/Field.jsx';
import { weekStart } from './labels.js';

export default function Calendar({ canEdit }) {
  const [from, setFrom] = useState(weekStart());
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [assign, setAssign] = useState({ userId: '', mode: 'fixed', fixedShift: '', daysOff: ['sun'], weekly: {} });

  const load = () => api.get('/admin/staff/calendar', { params: { from } }).then(({ data: d }) => setData(d));

  useEffect(() => {
    load();
    api.get('/admin/staff').then(({ data: d }) => setUsers(d.users || []));
  }, [from]);

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (!assign.userId) return;
    await api.patch(`/admin/staff/${assign.userId}/schedule`, {
      mode: assign.mode,
      fixedShift: assign.fixedShift || null,
      daysOff: assign.daysOff,
      weekly: assign.weekly
    });
    load();
  };

  const pickUser = (id) => {
    const user = users.find((u) => u.id === id);
    const weekly = {};
    for (const d of WEEKDAYS) weekly[d.id] = user?.schedule?.weekly?.[d.id] || '';
    setAssign({
      userId: id,
      mode: user?.schedule?.mode || 'fixed',
      fixedShift: user?.schedule?.fixedShift || data?.shifts?.[0]?.id || '',
      daysOff: user?.schedule?.daysOff || ['sun'],
      weekly
    });
  };

  if (!data) return <p>Loading calendar…</p>;

  return (
    <>
      <div className="toolbar no-print">
        <Field label="Week of">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table className="data calendar">
          <thead>
            <tr>
              <th>Staff</th>
              {data.days.map((d) => (
                <th key={d.date}>{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.userId}>
                <td>
                  <strong>{row.name}</strong>
                  <div className="muted">{row.title}</div>
                </td>
                {row.days.map((shift, i) => (
                  <td key={data.days[i].date}>
                    {shift ? (
                      <span className="shift-chip" style={{ borderColor: shift.color }}>
                        {shift.name}
                        <small>
                          {shift.startTime}–{shift.endTime}
                        </small>
                      </span>
                    ) : (
                      <span className="muted">Off</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <form className="panel form-grid no-print" style={{ marginTop: 16 }} onSubmit={saveSchedule}>
          <h3>Assign shift</h3>
          <Field label="Staff">
            <select required value={assign.userId} onChange={(e) => pickUser(e.target.value)}>
              <option value="">Select staff</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Schedule type">
            <select value={assign.mode} onChange={(e) => setAssign({ ...assign, mode: e.target.value })}>
              <option value="fixed">Fixed recurring</option>
              <option value="weekly">Weekly rotating</option>
            </select>
          </Field>
          {assign.mode === 'fixed' ? (
            <>
              <Field label="Shift">
                <select value={assign.fixedShift} onChange={(e) => setAssign({ ...assign, fixedShift: e.target.value })}>
                  <option value="">None / off</option>
                  {(data.shifts || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime}–{s.endTime})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Days off">
                <div className="checks">
                  {WEEKDAYS.map((d) => (
                    <label key={d.id}>
                      <input
                        type="checkbox"
                        checked={assign.daysOff.includes(d.id)}
                        onChange={() =>
                          setAssign((f) => ({
                            ...f,
                            daysOff: f.daysOff.includes(d.id) ? f.daysOff.filter((x) => x !== d.id) : [...f.daysOff, d.id]
                          }))
                        }
                      />{' '}
                      {d.label}
                    </label>
                  ))}
                </div>
              </Field>
            </>
          ) : (
            WEEKDAYS.map((d) => (
              <Field key={d.id} label={d.label}>
                <select
                  value={assign.weekly[d.id] || ''}
                  onChange={(e) => setAssign({ ...assign, weekly: { ...assign.weekly, [d.id]: e.target.value } })}
                >
                  <option value="">Off</option>
                  {(data.shifts || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            ))
          )}
          <button className="btn" type="submit" disabled={!assign.userId}>
            Save schedule
          </button>
        </form>
      ) : null}
    </>
  );
}
