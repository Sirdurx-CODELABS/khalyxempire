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
  const token = localStorage.getItem('khalyx_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function saveAdminToken(token) {
  if (token) localStorage.setItem('khalyx_admin_token', token);
}

export function clearAdminToken() {
  localStorage.removeItem('khalyx_admin_token');
}

export function money(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

export async function downloadFile(url, filename, params) {
  const { data } = await api.get(url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
