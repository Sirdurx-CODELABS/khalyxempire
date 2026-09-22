import { useEffect, useState } from 'react';
import { DataTable } from '@khalyx/ui';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const blank = () => ({ name: '', slug: '', description: '', subcategories: '', sortOrder: 0, image: '' });

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api.get('/admin/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => setCategories([]));

  useEffect(() => {
    load();
  }, []);

  const startEdit = (c) => {
    setEditing(c._id);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      subcategories: (c.subcategories || []).join(', '),
      sortOrder: c.sortOrder || 0,
      image: c.image || ''
    });
    setError('');
    setMessage('');
  };

  const reset = () => {
    setEditing('');
    setForm(blank());
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
      subcategories: form.subcategories
    };
    try {
      if (editing) await api.patch(`/admin/categories/${editing}`, payload);
      else await api.post('/admin/categories', payload);
      setMessage(editing ? 'Category updated' : 'Category created');
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save category');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this category? Products must be reassigned first.')) return;
    setError('');
    try {
      await api.delete(`/admin/categories/${id}`);
      if (editing === id) reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Categories</h1>
      </div>
      <p className="muted" style={{ marginTop: -4 }}>
        Manage storefront and POS category chips. Subcategories are comma-separated.
      </p>
      {error ? <p className="alert">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      <div className="split" style={{ display: 'grid', gap: 16 }}>
        <DataTable
          rows={categories}
          searchKeys={['name', 'slug']}
          searchPlaceholder="Category name"
          columns={[
            { id: 'name', header: 'Name', accessor: (c) => c.name },
            { id: 'slug', header: 'Slug', accessor: (c) => c.slug },
            {
              id: 'subs',
              header: 'Subcategories',
              accessor: (c) => (c.subcategories || []).join(', '),
              cell: (c) => (c.subcategories || []).join(', ') || '—'
            },
            { id: 'sort', header: 'Sort', accessor: (c) => c.sortOrder },
            { id: 'products', header: 'Products', accessor: (c) => c.productCount || 0 },
            {
              id: 'actions',
              header: '',
              sortable: false,
              cell: (c) => (
                <>
                  <button className="btn small ghost" type="button" onClick={() => startEdit(c)}>
                    Edit
                  </button>{' '}
                  <button className="btn small danger" type="button" onClick={() => remove(c._id)}>
                    Delete
                  </button>
                </>
              )
            }
          ]}
        />
        <form className="panel form-grid" onSubmit={save}>
          <h3>{editing ? 'Edit category' : 'New category'}</h3>
          <Field label="Name" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Slug" hint="Leave blank to auto-generate from name">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" />
          </Field>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Subcategories" hint="Comma-separated">
            <input
              value={form.subcategories}
              onChange={(e) => setForm({ ...form, subcategories: e.target.value })}
              placeholder="Tops, Bottoms"
            />
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </Field>
          <Field label="Image URL">
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit">
              {editing ? 'Save changes' : 'Create category'}
            </button>
            {editing ? (
              <button className="btn ghost" type="button" onClick={reset}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}
