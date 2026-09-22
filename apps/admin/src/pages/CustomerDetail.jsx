import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable } from '@khalyx/ui';
import { api, money } from '../api/client.js';
import Field from '../components/Field.jsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/admin/customers/${id}`).then(({ data: d }) => setData(d));
  }, [id]);

  if (!data) return <p>Loading customer…</p>;

  return (
    <>
      <div className="page-head">
        <h1>{data.customer.name}</h1>
      </div>
      <p className="muted">
        {data.customer.email} · {data.customer.phone}
        {(data.customer.tags || []).length ? ` · ${(data.customer.tags || []).join(', ')}` : ''}
      </p>
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await api.patch(`/admin/customers/${id}`, { notes: fd.get('notes'), tags: fd.get('tags') });
          api.get(`/admin/customers/${id}`).then(({ data: d }) => setData(d));
        }}
      >
        <Field label="Tags">
          <input name="tags" defaultValue={(data.customer.tags || []).join(', ')} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" defaultValue={data.customer.notes || ''} rows={3} />
        </Field>
        <button className="btn" type="submit">
          Save notes
        </button>
      </form>
      <DataTable
        rows={data.orders || []}
        rowKey={(o) => o.id || o.orderNumber}
        searchKeys={['orderNumber', 'status']}
        columns={[
          {
            id: 'orderNumber',
            header: 'Order',
            accessor: (o) => o.orderNumber,
            cell: (o) => <Link to={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
          },
          { id: 'status', header: 'Status', accessor: (o) => o.status },
          { id: 'total', header: 'Total', accessor: (o) => o.total, cell: (o) => money(o.total) }
        ]}
      />
    </>
  );
}
