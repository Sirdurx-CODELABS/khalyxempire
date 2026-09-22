import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdminAuth } from './store/authStore.js';
import Layout from './components/Layout.jsx';
import Guard from './components/Guard.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import InviteAccept from './pages/InviteAccept.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import ProductView from './pages/ProductView.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import InventoryView from './pages/InventoryView.jsx';
import Coupons from './pages/Coupons.jsx';
import Reports from './pages/Reports.jsx';
import Staff from './pages/Staff.jsx';
import Labels from './pages/Labels.jsx';
import Settings from './pages/Settings.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Categories from './pages/Categories.jsx';

export default function App() {
  const hydrate = useAdminAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/invite" element={<InviteAccept />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={
          <Guard permission="dashboard">
            <Dashboard />
          </Guard>
        } />
        <Route
          path="products"
          element={
            <Guard permission="products">
              <Products />
            </Guard>
          }
        />
        <Route
          path="products/new"
          element={
            <Guard permission="products">
              <ProductForm />
            </Guard>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <Guard permission="products">
              <ProductForm />
            </Guard>
          }
        />
        <Route
          path="products/:id"
          element={
            <Guard permission="products">
              <ProductView />
            </Guard>
          }
        />
        <Route
          path="orders"
          element={
            <Guard permission="orders">
              <Orders />
            </Guard>
          }
        />
        <Route
          path="orders/:orderNumber"
          element={
            <Guard permission="orders">
              <OrderDetail />
            </Guard>
          }
        />
        <Route
          path="customers"
          element={
            <Guard permission="customers">
              <Customers />
            </Guard>
          }
        />
        <Route
          path="customers/:id"
          element={
            <Guard permission="customers">
              <CustomerDetail />
            </Guard>
          }
        />
        <Route
          path="inventory"
          element={
            <Guard permission="inventory">
              <Inventory />
            </Guard>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <Guard permission="inventory">
              <InventoryView />
            </Guard>
          }
        />
        <Route
          path="suppliers"
          element={
            <Guard permission="inventory">
              <Suppliers />
            </Guard>
          }
        />
        <Route
          path="labels"
          element={
            <Guard permission="inventory">
              <Labels />
            </Guard>
          }
        />
        <Route
          path="coupons"
          element={
            <Guard permission="coupons">
              <Coupons />
            </Guard>
          }
        />
        <Route
          path="categories"
          element={
            <Guard permission="products">
              <Categories />
            </Guard>
          }
        />
        <Route
          path="reports"
          element={
            <Guard permission="reports">
              <Reports />
            </Guard>
          }
        />
        <Route
          path="staff"
          element={
            <Guard permission="staff">
              <Staff />
            </Guard>
          }
        />
        <Route
          path="settings"
          element={
            <Guard permission="staff">
              <Settings />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
