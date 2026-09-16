import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useErpAuth } from './store/authStore.js';
import { useOffline } from './store/offlineStore.js';
import Guard from './components/Guard.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Pos from './pages/Pos.jsx';
import Suppliers from './pages/Suppliers.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Clock from './pages/Clock.jsx';
import Reconciliation from './pages/Reconciliation.jsx';
import Labels from './pages/Labels.jsx';

export default function App() {
  const hydrate = useErpAuth((s) => s.hydrate);
  const setOnline = useOffline((s) => s.setOnline);
  const flush = useOffline((s) => s.flush);

  useEffect(() => {
    hydrate();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if (navigator.onLine) flush();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [hydrate, setOnline, flush]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<Pos />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="clock" element={<Clock />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="labels" element={<Labels />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
