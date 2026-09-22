import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api
      .get('/wishlist')
      .then(({ data }) => {
        setProducts(data.products || []);
        setError('');
      })
      .catch(() => setError('Could not load your wishlist.'));

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    setBusy(id);
    setError('');
    try {
      const { data } = await api.delete(`/wishlist/${id}`);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove that item');
    } finally {
      setBusy('');
    }
  };

  if (error && !products.length) return <p className="alert">{error}</p>;
  if (!products.length) {
    return (
      <div className="empty">
        <p>Nothing saved yet.</p>
        <Link className="btn" to="/shop">
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="alert">{error}</p> : null}
      <div className="wishlist-grid">
        {products.map((p) => (
          <div className="wishlist-item" key={p._id}>
            <ProductCard product={p} />
            <button
              className="btn ghost full"
              type="button"
              disabled={busy === p._id}
              onClick={() => remove(p._id)}
            >
              {busy === p._id ? 'Removing…' : 'Remove from wishlist'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
