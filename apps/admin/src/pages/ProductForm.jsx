import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Field from '../components/Field.jsx';

const emptyVariant = () => ({ size: '', color: '', price: '', stock: 10, compareAtPrice: 0, sku: '', barcode: '', lowStockThreshold: 5 });

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
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [error, setError] = useState('');
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
    isActive: true,
    seoTitle: '',
    seoDescription: '',
    variants: [emptyVariant()]
  });

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(data.categories));
    if (id && id !== 'new') {
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
          isActive: p.isActive,
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          variants: p.variants.length ? p.variants : [emptyVariant()]
        });
        setImageColor(colorImages[0]?.color || p.variants.find((v) => v.color)?.color || '');
      });
    }
  }, [id]);

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

  const uploadFiles = async (files) => {
    const body = new FormData();
    [...files].forEach((f) => body.append('images', f));
    const { data } = await api.post('/admin/uploads', body);
    return data.urls || [];
  };

  const upload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const urls = await uploadFiles(files);
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    e.target.value = '';
  };

  const uploadColor = async (e) => {
    const files = e.target.files;
    if (!files?.length || !imageColor) return;
    const urls = await uploadFiles(files);
    setForm((f) => ({ ...f, colorImages: upsertColorImages(f.colorImages, imageColor, urls) }));
    e.target.value = '';
  };

  const removeColorImage = (src) => {
    setForm((f) => ({
      ...f,
      colorImages: upsertColorImages(
        f.colorImages,
        imageColor,
        (f.colorImages.find((c) => c.color === imageColor)?.images || []).filter((i) => i !== src),
        true
      )
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      variants: form.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        stock: Number(v.stock),
        compareAtPrice: Number(v.compareAtPrice) || 0
      }))
    };
    try {
      if (id && id !== 'new') await api.patch(`/admin/products/${id}`, payload);
      else await api.post('/admin/products', payload);
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save product');
    }
  };

  const activeCat = cats.find((c) => c._id === form.category);
  const selectedColorImages = form.colorImages.find((c) => c.color === imageColor)?.images || [];

  return (
    <form className="form-grid" onSubmit={save}>
      <div className="page-head">
        <h1>{id === 'new' || !id ? 'New product' : 'Edit product'}</h1>
        <button className="btn" type="submit">
          Save
        </button>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <div className="split wide" style={{ display: 'grid', gap: 16 }}>
        <div className="panel form-grid">
          <Field label="Product name">
            <input required placeholder="Heritage Tote" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Description">
            <textarea rows={5} placeholder="What the customer should know" value={form.description} onChange={set('description')} />
          </Field>
          <div className="form-row">
            <Field label="Category">
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
          <Field label="Tags" hint="Comma separated">
            <input placeholder="leather, tote, gold" value={form.tags} onChange={set('tags')} />
          </Field>
          <Field label="SEO title">
            <input placeholder="Shown in search results" value={form.seoTitle} onChange={set('seoTitle')} />
          </Field>
          <Field label="SEO description">
            <textarea placeholder="Short summary for Google" value={form.seoDescription} onChange={set('seoDescription')} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured
          </label>
          <label className="check">
            <input type="checkbox" checked={form.newArrival} onChange={set('newArrival')} /> New arrival
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active
          </label>
        </div>
        <div className="panel form-grid">
          <h3>Default gallery</h3>
          <Field label="Upload images" hint="Used when a colour has no photos of its own">
            <input type="file" accept="image/*" multiple onChange={upload} />
          </Field>
          {form.images.map((src) => (
            <div key={src} className="image-row">
              <img className="thumb" src={src} alt="" />
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setForm({ ...form, images: form.images.filter((i) => i !== src) })}
              >
                Remove
              </button>
            </div>
          ))}
          <Field label="Or paste image URL">
            <input
              placeholder="https://…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const url = e.target.value.trim();
                  if (url) setForm({ ...form, images: [...form.images, url] });
                  e.target.value = '';
                }
              }}
            />
          </Field>
        </div>
      </div>
      <div className="panel">
        <div className="page-head">
          <h2>Variants</h2>
          <button className="btn ghost" type="button" onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })}>
            Add variant
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Size</th>
                <th>Colour</th>
                <th>Price</th>
                <th>Compare</th>
                <th>Stock</th>
                <th>SKU</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.variants.map((v, i) => (
                <tr key={v._id || i}>
                  <td>
                    <Field label="Size">
                      <input value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} placeholder="OS" />
                    </Field>
                  </td>
                  <td>
                    <Field label="Colour">
                      <input value={v.color} onChange={(e) => setVariant(i, 'color', e.target.value)} placeholder="Black" />
                    </Field>
                  </td>
                  <td>
                    <Field label="Price (NGN)">
                      <input type="number" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Compare at">
                      <input type="number" value={v.compareAtPrice} onChange={(e) => setVariant(i, 'compareAtPrice', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="Stock">
                      <input type="number" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
                    </Field>
                  </td>
                  <td>
                    <Field label="SKU">
                      <input value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} placeholder="auto" />
                    </Field>
                  </td>
                  <td>
                    <button className="btn small danger" type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="color-images">
          <h3>Images by colour</h3>
          <p className="muted">Add colours on the variants above, then choose a colour and upload photos for it. Shoppers see those photos when they pick that colour.</p>
          {colors.length === 0 ? (
            <p className="muted">No colours yet. Type a colour on a variant first.</p>
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
                <input type="file" accept="image/*" multiple disabled={!imageColor} onChange={uploadColor} />
              </Field>
              <div className="image-grid">
                {selectedColorImages.map((src) => (
                  <div key={src} className="image-row">
                    <img className="thumb" src={src} alt={imageColor} />
                    <button type="button" className="btn small ghost" onClick={() => removeColorImage(src)}>
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
