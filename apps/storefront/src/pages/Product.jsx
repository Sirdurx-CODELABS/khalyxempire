import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../store/authStore.js';
import { useCart } from '../store/cartStore.js';
import { money } from '../lib/money.js';
import Seo from '../components/Seo.jsx';
import { BackIcon, colorSwatch } from '../components/Icons.jsx';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const add = useCart((s) => s.add);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [image, setImage] = useState(0);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [review, setReview] = useState({ rating: 5, title: '', body: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/products/${slug}`).then(({ data }) => {
      setProduct(data.product);
      setReviews(data.reviews || []);
      setVariantId(data.product.variants.find((v) => v.stock > 0)?._id || data.product.variants[0]?._id || '');
      setImage(0);
      setQty(1);
    });
  }, [slug]);

  const variant = useMemo(() => product?.variants.find((v) => v._id === variantId), [product, variantId]);
  const sizes = [...new Set(product?.variants.map((v) => v.size).filter(Boolean) || [])];
  const colors = [...new Set(product?.variants.map((v) => v.color).filter(Boolean) || [])];
  const gallery = useMemo(() => {
    const color = variant?.color;
    const shots = product?.colorImages?.find((c) => c.color.toLowerCase() === String(color || '').toLowerCase())?.images;
    if (shots?.length) return shots;
    return product?.images || [];
  }, [product, variant]);

  const goBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(product?.category?.slug ? `/shop/${product.category.slug}` : '/shop');
  };

  if (!product) return <div className="section container">Loading…</div>;

  const pickSize = (size) => {
    const color = variant?.color;
    const next =
      product.variants.find((v) => v.size === size && (!color || v.color === color)) ||
      product.variants.find((v) => v.size === size) ||
      product.variants[0];
    setVariantId(next._id);
    setImage(0);
  };

  const pickColor = (color) => {
    const size = variant?.size;
    const next =
      product.variants.find((v) => v.color === color && (!size || v.size === size)) ||
      product.variants.find((v) => v.color === color) ||
      product.variants[0];
    setVariantId(next._id);
    setImage(0);
  };

  const addBag = async () => {
    setError('');
    try {
      await add({ productId: product._id, variantId, qty });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add to bag');
    }
  };

  const wish = async () => {
    if (!user) return;
    await api.post(`/wishlist/${product._id}`);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    await api.post('/reviews', { productId: product._id, ...review });
    const { data } = await api.get(`/products/${slug}`);
    setProduct(data.product);
    setReviews(data.reviews);
  };

  const sizeAvailable = (size) =>
    product.variants.some((v) => v.size === size && (!variant?.color || v.color === variant.color) && v.stock > 0);
  const colorAvailable = (color) => product.variants.some((v) => v.color === color && v.stock > 0);

  return (
    <div className="section">
      <Seo
        title={product.seoTitle || product.name}
        description={product.seoDescription || product.description}
        path={`/product/${product.slug}`}
      />
      <div className="container">
        <button className="back-link" type="button" onClick={goBack}>
          <BackIcon />
          Back
        </button>
      </div>
      <div className="container pdp">
        <div className="gallery">
          {gallery.length ? (
            <>
              <img src={gallery[image] || gallery[0]} alt={product.name} />
              <div className="thumbs">
                {gallery.map((src, i) => (
                  <img key={src} className={i === image ? 'on' : ''} src={src} alt="" onClick={() => setImage(i)} />
                ))}
              </div>
            </>
          ) : (
            <div className="card-photo-fallback gallery-fallback" aria-hidden="true">
              KE
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">{product.category?.name}</p>
          <h1>{product.name}</h1>
          <p className="stars">
            {'★'.repeat(Math.round(product.ratingAverage || 0))}
            {'☆'.repeat(5 - Math.round(product.ratingAverage || 0))} {product.ratingCount} reviews
          </p>
          <p className="price" style={{ fontSize: 22 }}>
            {variant?.compareAtPrice > variant?.price ? <s>{money(variant.compareAtPrice)}</s> : null}
            {money(variant?.price)}
          </p>
          <p>{product.description}</p>
          {sizes.length ? (
            <>
              <label className="muted">Size</label>
              <div className="chip-row" style={{ margin: '8px 0 16px' }}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={`chip ${variant?.size === s ? 'on' : ''}`}
                    type="button"
                    disabled={!sizeAvailable(s) && variant?.size !== s}
                    onClick={() => pickSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {colors.length ? (
            <>
              <label className="muted">Colour{variant?.color ? ` — ${variant.color}` : ''}</label>
              <div className="chip-row swatch-row" style={{ margin: '8px 0 16px' }}>
                {colors.map((c) => {
                  const hex = colorSwatch(c);
                  return (
                    <button
                      key={c}
                      className={`swatch ${variant?.color === c ? 'on' : ''} ${colorAvailable(c) ? '' : 'sold'}`}
                      type="button"
                      style={hex ? { '--swatch': hex } : undefined}
                      aria-label={c}
                      title={c}
                      onClick={() => pickColor(c)}
                    >
                      {!hex ? c : <span className="sr-only">{c}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          <div className="qty" style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))}>
              −
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((n) => Math.min(variant?.stock || 1, n + 1))}>
              +
            </button>
          </div>
          {error ? <p className="alert">{error}</p> : null}
          <button className="btn full" type="button" onClick={addBag} disabled={!variant?.stock}>
            {variant?.stock ? 'Add to bag' : 'Sold out'}
          </button>
          {user ? (
            <button className="btn ghost full" style={{ marginTop: 8 }} type="button" onClick={wish}>
              Save to wishlist
            </button>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              <Link to="/login">Sign in</Link> to save this piece.
            </p>
          )}
        </div>
      </div>
      <div className="container" style={{ marginTop: 48 }}>
        <h2>Reviews</h2>
        {reviews.map((r) => (
          <article key={r._id} style={{ padding: '16px 0', borderBottom: '1px solid #e8e0d0' }}>
            <strong>{r.user?.name}</strong>
            <div className="stars">{'★'.repeat(r.rating)}</div>
            <p>{r.body}</p>
          </article>
        ))}
        {user ? (
          <form className="form" style={{ maxWidth: 520, marginTop: 24 }} onSubmit={submitReview}>
            <h3>Write a review</h3>
            <select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
            <input placeholder="Title" value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} />
            <textarea rows={4} placeholder="Your notes" value={review.body} onChange={(e) => setReview({ ...review, body: e.target.value })} />
            <button className="btn" type="submit">
              Submit
            </button>
          </form>
        ) : (
          <p className="muted">Sign in to leave a review.</p>
        )}
      </div>
    </div>
  );
}
