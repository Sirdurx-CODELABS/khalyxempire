import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api } from '../../api/client.js';
import Field from '../../components/Field.jsx';

const blankShift = { name: '', startTime: '08:00', endTime: '16:00', color: '#d4af37' };

export default function Settings({ canEdit }) {
  const [shifts, setShifts] = useState([]);
  const [settings, setSettings] = useState({ graceMinutes: 10, defaultShift: '', assignDefaultOnCreate: false });
  const [form, setForm] = useState(blankShift);
  const [error, setError] = useState('');

  const load = () =>
    api.get('/admin/staff/shifts').then(({ data }) => {
      setShifts(data.shifts || []);
      setSettings(data.settings || settings);
    });

  useEffect(() => {
    load();
  }, []);

  const saveShift = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/staff/shifts', form);
      setForm(blankShift);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save shift');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    await api.patch('/admin/staff/shift-settings', settings);
    load();
  };

  return (
    <div className="staff-split">
      <div>
        <h3>Shift types</h3>
        <DataTable
          rows={shifts}
          rowKey={(s) => s.id}
          searchKeys={['name']}
          columns={[
            {
              id: 'name',
              header: 'Name',
              accessor: (s) => s.name,
              cell: (s) => (
                <span className="shift-chip" style={{ borderColor: s.color }}>
                  {s.name}
                </span>
              )
            },
            { id: 'hours', header: 'Hours', accessor: (s) => `${s.startTime}–${s.endTime}` },
            {
              id: 'actions',
              header: 'Actions',
              sortable: false,
              cell: (s) =>
                canEdit ? (
                  <button className="btn small danger" type="button" onClick={() => api.delete(`/admin/staff/shifts/${s.id}`).then(load)}>
                    Remove
                  </button>
                ) : null
            }
          ]}
        />
        {canEdit ? (
          <form className="panel form-grid" style={{ marginTop: 16 }} onSubmit={saveShift}>
            <h3>New shift</h3>
            {error ? <p className="alert">{error}</p> : null}
            <Field label="Name" required>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Start">
              <input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label="End">
              <input type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
            <Field label="Color">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </Field>
            <button className="btn" type="submit">
              Add shift
            </button>
          </form>
        ) : null}
      </div>
      <form className="panel form-grid" onSubmit={saveSettings}>
        <h3>Attendance rules</h3>
        <Field label="Grace period (minutes)" hint="Clock-ins after shift start plus this buffer are marked late">
          <input
            type="number"
            min="0"
            value={settings.graceMinutes}
            onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
            disabled={!canEdit}
          />
        </Field>
        <Field label="Default shift for new staff">
          <select
            value={settings.defaultShift}
            onChange={(e) => setSettings({ ...settings, defaultShift: e.target.value })}
            disabled={!canEdit}
          >
            <option value="">None</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={Boolean(settings.assignDefaultOnCreate)}
            disabled={!canEdit}
            onChange={(e) => setSettings({ ...settings, assignDefaultOnCreate: e.target.checked })}
          />{' '}
          Auto-assign default shift when creating staff
        </label>
        {canEdit ? (
          <button className="btn" type="submit">
            Save rules
          </button>
        ) : null}
      </form>
    </div>
  );
}
