import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Seo from '../components/Seo.jsx';
import { WHATSAPP_GROUP_URL } from '../components/WhatsApp.jsx';
import { productCover } from '../lib/money.js';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [cats, setCats] = useState([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  const loadCatalog = async () => {
    const { data } = await api.get('/products', { params: { sort: 'newest', limit: 48 } });
    const latest = data.products || [];
    let featuredList = latest.slice(0, 8);
    let arrivalList = latest;
    const [featRes, arrivRes, catRes] = await Promise.allSettled([
      api.get('/products', { params: { featured: 'true', limit: 24 } }),
      api.get('/products', { params: { newArrival: 'true', limit: 48 } }),
      api.get('/categories')
    ]);
    if (featRes.status === 'fulfilled' && featRes.value.data?.products?.length) {
      featuredList = featRes.value.data.products;
    }
    if (arrivRes.status === 'fulfilled' && arrivRes.value.data?.products?.length) {
      arrivalList = arrivRes.value.data.products;
    }
    return {
      featured: featuredList,
      arrivals: arrivalList.length ? arrivalList : latest,
      cats: catRes.status === 'fulfilled' ? catRes.value.data?.categories || [] : []
    };
  };

  useEffect(() => {
    let live = true;
    let attempts = 0;

    const run = async () => {
      while (live && attempts < 8) {
        attempts += 1;
        try {
          const next = await loadCatalog();
          if (!live) return;
          setFeatured(next.featured);
          setArrivals(next.arrivals);
          setCats(next.cats);
          setError('');
          setLoading(false);
          return;
        } catch {
          if (!live) return;
          if (attempts >= 8) {
            setError('Could not load the catalog. The API may still be starting — try again in a moment.');
            setLoading(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    };

    run();
    const id = setInterval(async () => {
      try {
        const next = await loadCatalog();
        if (!live) return;
        setFeatured(next.featured);
        setArrivals(next.arrivals);
        setCats(next.cats);
      } catch {
        /* keep last good catalog */
      }
    }, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (arrivals.length < 2) return undefined;
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % arrivals.length);
    }, 4500);
    return () => clearInterval(id);
  }, [arrivals.length]);

  useEffect(() => {
    setHeroIndex((i) => (arrivals.length ? Math.min(i, arrivals.length - 1) : 0));
  }, [arrivals.length]);

  const subscribe = async (e) => {
    e.preventDefault();
    await api.post('/subscribers', { email, phone });
    setNote('You are on the list.');
    setEmail('');
    setPhone('');
  };

  return (
    <>
      <Seo title="Home" path="/" />
      {error ? (
        <div className="container">
          <p className="alert">
            {error}{' '}
            <button className="text-btn" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </p>
        </div>
      ) : null}
      {loading && !error ? (
        <div className="container">
          <p className="muted">Loading the collection…</p>
        </div>
      ) : null}
      <section className="hero">
        <div className="hero-media" aria-hidden={arrivals.length ? undefined : true}>
          {arrivals.length ? (
            arrivals.map((p, i) => {
              const src = productCover(p);
              return (
                <div key={p._id} className={`hero-slide ${i === heroIndex ? 'is-active' : ''}`}>
                  {src ? <img src={src} alt="" /> : <div className="hero-slide-fallback" />}
                </div>
              );
            })
          ) : (
            <div className="hero-slide is-active hero-slide-fallback" />
          )}
        </div>
        <div className="container hero-copy">
          <p className="eyebrow">Khalyx Empire · New arrivals</p>
          <h1>Gold. Black. Heritage.</h1>
          <p>
            {arrivals[heroIndex]
              ? `${arrivals[heroIndex].name} — and ${Math.max(0, arrivals.length - 1)} more just landed.`
              : 'Footwear, traditional wear, streetwear and objects of desire — designed for the ones who move like they own the room.'}
          </p>
          <div className="hero-actions">
            {arrivals[heroIndex] ? (
              <Link className="btn" to={`/product/${arrivals[heroIndex].slug}`}>
                View this piece
              </Link>
            ) : (
              <Link className="btn" to="/shop">
                Shop the collection
              </Link>
            )}
            <Link className="btn ghost" to="/shop?newArrival=true">
              All new arrivals
            </Link>
            <a className="btn dark" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
              Join WhatsApp
            </a>
          </div>
          {arrivals.length > 1 ? (
            <div className="hero-thumbs" role="tablist" aria-label="New arrival products">
              {arrivals.map((p, i) => {
                const src = productCover(p);
                return (
                  <button
                    key={p._id}
                    type="button"
                    role="tab"
                    aria-selected={i === heroIndex}
                    className={`hero-thumb ${i === heroIndex ? 'is-active' : ''}`}
                    onClick={() => setHeroIndex(i)}
                    title={p.name}
                  >
                    {src ? <img src={src} alt={p.name} /> : <span>{p.name.slice(0, 1)}</span>}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Categories</h2>
            <Link to="/shop">View all</Link>
          </div>
          <div className="tiles">
            {cats.map((c) => (
              <Link className="tile" key={c.slug} to={`/shop/${c.slug}`}>
                {c.image ? <img src={c.image} alt="" /> : null}
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>Featured</h2>
            <Link to="/shop">Shop</Link>
          </div>
          <div className="grid">
            {featured.length ? featured.map((p) => <ProductCard key={p._id} product={p} />) : <p className="muted">No products in the catalog yet.</p>}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>New arrivals</h2>
            <Link to="/shop?newArrival=true">Shop all</Link>
          </div>
          <div className="grid">
            {arrivals.length ? arrivals.map((p) => <ProductCard key={p._id} product={p} />) : <p className="muted">No new arrivals flagged yet — mark products as New arrival in Admin.</p>}
          </div>
        </div>
      </section>

      <section className="newsletter">
        <div className="container newsletter-inner">
          <div>
            <p className="eyebrow">Broadcast</p>
            <h2>Drops, restocks, and private fittings.</h2>
            <p>Join the list by email, or hop into the WhatsApp group for drops as they land.</p>
          </div>
          <form className="form" onSubmit={subscribe}>
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="WhatsApp number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn" type="submit">
              Join the list
            </button>
            <a className="btn ghost" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
              Open WhatsApp group
            </a>
            {note ? <p className="ok-msg">{note}</p> : null}
          </form>
        </div>
      </section>
    </>
  );
}
