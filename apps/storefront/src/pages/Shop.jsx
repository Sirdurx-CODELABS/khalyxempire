import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Seo from '../components/Seo.jsx';
import { colorSwatch } from '../components/Icons.jsx';

export default function Shop() {
  const { category } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], facets: { sizes: [], colors: [] }, total: 0 });
  const [cats, setCats] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(
    () => ({
      q: params.get('q') || '',
      category: category || params.get('category') || '',
      subcategory: params.get('subcategory') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      size: params.get('size') || '',
      color: params.get('color') || '',
      sort: params.get('sort') || 'newest',
      page: params.get('page') || 1
    }),
    [params, category]
  );

  useEffect(() => {
    api.get('/categories').then(({ data: d }) => setCats(d.categories || [])).catch(() => setCats([]));
  }, []);

  useEffect(() => {
    api
      .get('/products', { params: { ...query, limit: 12 } })
      .then(({ data: d }) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('Could not load products from the server.'));
  }, [query]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next);
  };

  const activeCat = cats.find((c) => c.slug === query.category);

  return (
    <div className="section">
      <Seo title={activeCat?.name || 'Shop'} description={`Shop ${activeCat?.name || 'the Khalyx Empire collection'}.`} path={`/shop/${query.category || ''}`} />
      <div className="container">
        {error ? <p className="alert">{error}</p> : null}
        <button className="btn ghost filters-toggle" type="button" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? 'Hide filters' : 'Filters'}
        </button>
        <div className="shop-layout">
        <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
          <h3>Filter</h3>
          <label>Search</label>
          <input value={query.q} onChange={(e) => set('q', e.target.value)} placeholder="Search" />
          <label>Category</label>
          <select value={query.category} onChange={(e) => (window.location.href = e.target.value ? `/shop/${e.target.value}` : '/shop')}>
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {activeCat?.subcategories?.length ? (
            <>
              <label>Subcategory</label>
              <select value={query.subcategory} onChange={(e) => set('subcategory', e.target.value)}>
                <option value="">All</option>
                {activeCat.subcategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </>
          ) : null}
          <label>Min price (NGN)</label>
          <input type="number" value={query.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
          <label>Max price (NGN)</label>
          <input type="number" value={query.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
          <label>Size</label>
          <div className="chip-row">
            {data.facets.sizes.map((s) => (
              <button key={s} className={`chip ${query.size === s ? 'on' : ''}`} type="button" onClick={() => set('size', query.size === s ? '' : s)}>
                {s}
              </button>
            ))}
          </div>
          <label>Colour</label>
          <div className="chip-row">
            {data.facets.colors.map((c) => (
              <button key={c} className={`chip ${query.color === c ? 'on' : ''}`} type="button" onClick={() => set('color', query.color === c ? '' : c)}>
                <span className="mini-swatch" style={{ background: colorSwatch(c) || '#cfc6b4' }} />
                {c}
              </button>
            ))}
          </div>
        </aside>
        <div>
          <div className="section-head">
            <h2>{activeCat?.name || 'The collection'}</h2>
            <select value={query.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="popular">Popular</option>
            </select>
          </div>
          {data.products.length === 0 ? <p className="empty">No pieces match those filters.</p> : null}
          <div className="grid">
            {data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
