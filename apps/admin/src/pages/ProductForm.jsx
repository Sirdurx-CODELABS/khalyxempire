import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const emptyVariant = () => ({
  size: '',
  color: '',
  price: '',
  costPrice: '',
  stock: 0,
  compareAtPrice: 0,
  sku: '',
  barcode: '',
  lowStockThreshold: 5
});

function upsertColorImages(list, color, urls, replace = false) {
  const key = color.trim();
  if (!key) return list;
  const next = [...(list || [])];
  const index = next.findIndex((entry) => entry.color.toLowerCase() === key.toLowerCase());
  if (index >= 0) {
    next[index] = { ...next[index], images: replace ? urls : [...next[index].images, ...urls] };
  } else {
    next.push({ color: key, images: urls });
  }
  return next;
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageColor, setImageColor] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    images: [],
    colorImages: [],
    tags: '',
    featured: false,
    newArrival: false,
    status: 'active',
    seoTitle: '',
    seoDescription: '',
    basePrice: '',
    costPrice: '',
    suppliers: [],
    variants: [emptyVariant()]
  });

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(data.categories));
    api.get('/admin/products/meta/suppliers').then(({ data }) => setSuppliers(data.suppliers || [])).catch(() => {});
    if (!isNew) {
      api.get(`/admin/products/${id}`).then(({ data }) => {
        const p = data.product;
        const colorImages = p.colorImages || [];
        setForm({
          name: p.name,
          description: p.description,
          category: p.category?._id || p.category,
          subcategory: p.subcategory || '',
          images: p.images || [],
          colorImages,
          tags: (p.tags || []).join(', '),
          featured: p.featured,
          newArrival: p.newArrival,
          status: p.status === 'out_of_stock' ? 'active' : p.status || 'active',
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          basePrice: p.basePrice || p.variants?.[0]?.price || '',
          costPrice: p.costPrice || p.variants?.[0]?.costPrice || '',
          suppliers: (p.suppliers || []).map((s) => s._id || s),
          variants: p.variants.length ? p.variants.map((v) => ({ ...v, price: v.price, costPrice: v.costPrice || '' })) : [emptyVariant()]
        });
        setImageColor(colorImages[0]?.color || p.variants.find((v) => v.color)?.color || '');
      });
    }
  }, [id, isNew]);

  const colors = useMemo(
    () => [...new Set(form.variants.map((v) => String(v.color || '').trim()).filter(Boolean))],
    [form.variants]
  );

  useEffect(() => {
    if (!colors.length) {
      setImageColor('');
      return;
    }
    if (!colors.includes(imageColor)) setImageColor(colors[0]);
  }, [colors, imageColor]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [key]: value });
  };

  const setVariant = (index, key, value) => {
    const variants = form.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v));
    setForm({ ...form, variants });
  };

  const toggleSupplier = (sid) => {
    setForm((f) => ({
      ...f,
      suppliers: f.suppliers.includes(sid) ? f.suppliers.filter((id) => id !== sid) : [...f.suppliers, sid]
    }));
  };

  const uploadFiles = async (files) => {
    const body = new FormData();
    [...files].forEach((f) => body.append('images', f));
    const { data } = await api.post('/admin/uploads', body);
    return data.urls || [];
  };

  const addImages = async (files) => {
    if (!files?.length) return;
    const urls = await uploadFiles(files);
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
  };

  const moveImage = (from, to) => {
    if (to < 0 || to >= form.images.length) return;
    const images = [...form.images];
    const [item] = images.splice(from, 1);
    images.splice(to, 0, item);
    setForm({ ...form, images });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Product name is required';
    if (!form.category) next.category = 'Choose a category';
    if (form.basePrice === '' || Number(form.basePrice) < 0) next.basePrice = 'Base price is required';
    if (!form.variants.length) next.variants = 'Add at least one variant';
    form.variants.forEach((v, i) => {
      const price = v.price === '' || v.price === undefined ? form.basePrice : v.price;
      if (price === '' || Number(price) < 0) next[`price-${i}`] = 'Price is required (or set a base price)';
    });
    setErrors(next);
    return !Object.keys(next).length;
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) {
      setError('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      tags: String(form.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      variants: form.variants.map((v) => ({
        ...v,
        price: v.price === '' ? undefined : Number(v.price),
        costPrice: v.costPrice === '' ? undefined : Number(v.costPrice),
        stock: Number(v.stock) || 0,
        compareAtPrice: Number(v.compareAtPrice) || 0
      }))
    };
    try {
      if (!isNew) await api.patch(`/admin/products/${id}`, payload);
      else {
        const { data } = await api.post('/admin/products', payload);
        navigate(`/products/${data.product._id}`);
        return;
      }
      navigate(`/products/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const activeCat = cats.find((c) => c._id === form.category);
  const selectedColorImages = form.colorImages.find((c) => c.color === imageColor)?.images || [];

  return (
    <form className="form-grid" onSubmit={save}>
      <div className="page-head">
        <h1>{isNew ? 'New product' : 'Edit product'}</h1>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save / Update'}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="split wide" style={{ display: 'grid', gap: 16 }}>
        <div className="panel form-grid">
          <Field label="Product name" required error={errors.name}>
            <input required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Description">
            <textarea rows={5} value={form.description} onChange={set('description')} />
          </Field>
          <div className="form-row">
            <Field label="Category" required error={errors.category}>
              <select required value={form.category} onChange={set('category')}>
                <option value="">Select category</option>
                {cats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subcategory">
              <select value={form.subcategory} onChange={set('subcategory')}>
                <option value="">None</option>
                {(activeCat?.subcategories || []).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Base price (NGN)" required hint="Used when a variant price is left blank" error={errors.basePrice}>
              <input type="number" min={0} required value={form.basePrice} onChange={set('basePrice')} />
            </Field>
            <Field label="Cost price (NGN)" hint="Default cost for new variants">
              <input type="number" min={0} value={form.costPrice} onChange={set('costPrice')} />
            </Field>
          </div>
          <Field label="Tags" hint="Comma separated — shoes, abayas, bags">
            <input value={form.tags} onChange={set('tags')} />
          </Field>
          <Field label="Status" required>
            <select value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </Field>
          <Field label="Suppliers" hint="A product can come from more than one supplier">
            <div className="multi-select">
              {suppliers.length === 0 ? <span className="muted">No suppliers yet.</span> : null}
              {suppliers.map((s) => (
                <label key={s._id}>
                  <input type="checkbox" checked={form.suppliers.includes(s._id)} onChange={() => toggleSupplier(s._id)} /> {s.name}{' '}
                  <span className={`badge ${s.status}`}>{s.status}</span>
                </label>
              ))}
            </div>
          </Field>
          <label className="check">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured (homepage grid)
          </label>
          <label className="check">
            <input type="checkbox" checked={form.newArrival} onChange={set('newArrival')} /> New arrival (storefront hero)
          </label>
        </div>
        <div className="panel form-grid">
          <h3>Images</h3>
          <div
            className={`gallery-drop ${dragOver ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addImages(e.dataTransfer.files);
            }}
          >
            Drag and drop images here, or
            <Field label="Upload images">
              <input type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} />
            </Field>
          </div>
          <div className="gallery-list">
            {form.images.map((src, i) => (
              <div key={src} className={`gallery-item ${i === 0 ? 'is-primary' : ''}`}>
                <img src={src} alt="" />
                <button className="btn small ghost" type="button" onClick={() => setForm({ ...form, images: [src, ...form.images.filter((x) => x !== src)] })}>
                  Primary
                </button>
                <button className="btn small ghost" type="button" onClick={() => moveImage(i, i - 1)}>
                  ←
                </button>
                <button className="btn small ghost" type="button" onClick={() => moveImage(i, i + 1)}>
                  →
                </button>
                <button className="btn small danger" type="button" onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== src) })}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="page-head">
          <h2>Variants</h2>
          <button className="btn ghost" type="button" onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })}>
            Add variant
          </button>
        </div>
        {errors.variants ? <p className="field-error">{errors.variants}</p> : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Size</th>
                <th>Colour</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Price override</th>
                <th>Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.variants.map((v, i) => (
                <tr key={v._id || i}>
                  <td>
                    <Field label="Size">
                      <input value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Colour">
                      <input value={v.color} onChange={(e) => setVariant(i, 'color', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="SKU">
                      <input value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Stock" required>
                      <input type="number" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Price" hint="Blank = base price" error={errors[`price-${i}`]}>
                      <input type="number" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Cost">
                      <input type="number" value={v.costPrice} onChange={(e) => setVariant(i, 'costPrice', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <button className="btn small danger" type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="color-images" style={{ marginTop: 16 }}>
          <h3>Images by colour</h3>
          {colors.length === 0 ? (
            <p className="muted">Type a colour on a variant first.</p>
          ) : (
            <div className="form-grid">
              <Field label="Select colour">
                <select value={imageColor} onChange={(e) => setImageColor(e.target.value)}>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Upload images for ${imageColor || 'this colour'}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!imageColor}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length || !imageColor) return;
                    const urls = await uploadFiles(files);
                    setForm((f) => ({ ...f, colorImages: upsertColorImages(f.colorImages, imageColor, urls) }));
                    e.target.value = '';
                  }}
                />
              </Field>
              <div className="gallery-list">
                {selectedColorImages.map((src) => (
                  <div key={src} className="gallery-item">
                    <img src={src} alt={imageColor} />
                    <button
                      type="button"
                      className="btn small ghost"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          colorImages: upsertColorImages(
                            f.colorImages,
                            imageColor,
                            (f.colorImages.find((c) => c.color === imageColor)?.images || []).filter((i) => i !== src),
                            true
                          )
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
