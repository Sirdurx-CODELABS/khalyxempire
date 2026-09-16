import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Seo from '../components/Seo.jsx';
import { WHATSAPP_GROUP_URL } from '../components/WhatsApp.jsx';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [cats, setCats] = useState([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCatalog = async () => {
    const { data } = await api.get('/products', { params: { sort: 'newest', limit: 8 } });
    const latest = data.products || [];
    let featuredList = latest.slice(0, 4);
    let arrivalList = latest.slice(4, 8);
    const [featRes, arrivRes, catRes] = await Promise.allSettled([
      api.get('/products', { params: { featured: 'true', limit: 8 } }),
      api.get('/products', { params: { newArrival: 'true', limit: 8 } }),
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
    return () => {
      live = false;
    };
  }, []);

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
        <div className="container hero-copy">
          <p className="eyebrow">Khalyx Empire</p>
          <h1>Gold. Black. Heritage.</h1>
          <p>Footwear, traditional wear, streetwear and objects of desire — designed for the ones who move like they own the room.</p>
          <div className="hero-actions">
            <Link className="btn" to="/shop">
              Shop the collection
            </Link>
            <Link className="btn ghost" to="/shop/traditional-wear">
              Traditional wear
            </Link>
            <a className="btn dark" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
              Join WhatsApp
            </a>
          </div>
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
          </div>
          <div className="grid">
            {arrivals.length ? arrivals.map((p) => <ProductCard key={p._id} product={p} />) : null}
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
