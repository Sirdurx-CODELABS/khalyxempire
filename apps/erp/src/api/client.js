import axios from 'axios';

function resolveApiBase() {
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit) return `${String(explicit).replace(/\/$/, '')}/api`;
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:5000/api';
  }
  return '/api';
}

export const api = axios.create({
  baseURL: resolveApiBase(),
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khalyx_erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  let client = localStorage.getItem('khalyx_erp_client');
  if (!client) {
    client = crypto.randomUUID();
    localStorage.setItem('khalyx_erp_client', client);
  }
  config.headers['X-Erp-Client'] = client;
  return config;
});

export function saveErpToken(token) {
  if (token) localStorage.setItem('khalyx_erp_token', token);
}

export function clearErpToken() {
  localStorage.removeItem('khalyx_erp_token');
}

export function erpClientId() {
  let client = localStorage.getItem('khalyx_erp_client');
  if (!client) {
    client = crypto.randomUUID();
    localStorage.setItem('khalyx_erp_client', client);
  }
  return client;
}

export function money(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}
