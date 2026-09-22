import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAdminAuth } from '../store/authStore.js';
import People from './staff/People.jsx';
import Calendar from './staff/Calendar.jsx';
import Attendance from './staff/Attendance.jsx';
import Performance from './staff/Performance.jsx';
import Settings from './staff/Settings.jsx';

const TABS = [
  { id: 'people', label: 'All users' },
  { id: 'calendar', label: 'Shifts' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'performance', label: 'Performance' },
  { id: 'settings', label: 'Shift settings' }
];

export default function Staff() {
  const user = useAdminAuth((s) => s.user);
  const canEdit = user?.role === 'admin';
  const [tab, setTab] = useState('people');
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ titles: [], permissions: [] });
  const [overview, setOverview] = useState(null);

  const load = () => {
    api.get('/admin/staff').then(({ data }) => {
      setUsers(data.users || []);
      setMeta({ titles: data.titles || [], permissions: data.permissions || [] });
    });
    api.get('/admin/staff/overview').then(({ data }) => setOverview(data));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head no-print">
        <h1>Staff</h1>
      </div>
      {overview ? (
        <section className="stats">
          <article className="stat">
            <span>On the floor</span>
            <strong>{overview.onShift?.length || 0}</strong>
            <p className="muted">{(overview.onShift || []).map((s) => s.name).join(', ') || 'Nobody clocked in'}</p>
          </article>
          <article className="stat">
            <span>Scheduled today</span>
            <strong>{overview.today?.scheduled || 0}</strong>
          </article>
          <article className="stat">
            <span>Late today</span>
            <strong>{overview.today?.late || 0}</strong>
          </article>
          <article className="stat">
            <span>Absent today</span>
            <strong>{overview.today?.absent || 0}</strong>
          </article>
        </section>
      ) : null}
      <div className="tabs no-print">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} type="button" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'people' ? <People users={users} meta={meta} canEdit={canEdit} onChange={load} /> : null}
      {tab === 'calendar' ? <Calendar canEdit={canEdit} /> : null}
      {tab === 'attendance' ? <Attendance /> : null}
      {tab === 'performance' ? <Performance /> : null}
      {tab === 'settings' ? <Settings canEdit={canEdit} /> : null}
    </>
  );
}
