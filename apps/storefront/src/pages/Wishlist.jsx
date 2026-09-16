import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/wishlist').then(({ data }) => setProducts(data.products));
  }, []);

  if (!products.length) return <p className="empty">Nothing saved yet.</p>;

  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
