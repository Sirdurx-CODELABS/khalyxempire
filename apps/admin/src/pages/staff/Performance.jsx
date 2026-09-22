import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../../api/client.js';
import Field from '../../components/Field.jsx';
import { monthAgo, today } from './labels.js';

export default function Performance() {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);

  const load = () => api.get('/admin/staff/performance', { params: { from, to } }).then(({ data }) => setRows(data.rows || []));

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="toolbar no-print">
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <button className="btn ghost" type="button" onClick={load}>
          Compare
        </button>
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.userId}
        searchKeys={['name', 'title']}
        columns={[
          {
            id: 'name',
            header: 'Staff',
            accessor: (r) => r.name,
            cell: (r) => (
              <>
                {r.name}
                <div className="muted">{r.title}</div>
              </>
            )
          },
          { id: 'revenue', header: 'Sales', accessor: (r) => r.revenue, cell: (r) => money(r.revenue) },
          { id: 'orders', header: 'Orders', accessor: (r) => r.orders },
          { id: 'hours', header: 'Hours', accessor: (r) => r.hours },
          { id: 'present', header: 'Present', accessor: (r) => r.present },
          { id: 'absent', header: 'Absent', accessor: (r) => r.absent },
          { id: 'late', header: 'Late', accessor: (r) => r.late },
          { id: 'attendanceRate', header: 'Attendance', accessor: (r) => r.attendanceRate, cell: (r) => `${r.attendanceRate}%` }
        ]}
      />
    </>
  );
}
