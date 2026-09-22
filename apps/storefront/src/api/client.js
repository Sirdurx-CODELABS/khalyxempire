import axios from 'axios';

function resolveApiOrigin() {
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit) return String(explicit).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:5000';
  }
  // Dev: hit Express directly so Auth0 cookies + callback stay on the API host.
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return '';
}

function resolveApiBase() {
  const origin = resolveApiOrigin();
  if (origin) return `${origin}/api`;
  return '/api';
}

/** Absolute URL for browser navigations (OAuth) that must leave the Vite/Vercel origin. */
export function apiAbsoluteUrl(path) {
  const origin = resolveApiOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}

function guestId() {
  const key = 'khalyx_guest';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const api = axios.create({
  baseURL: resolveApiBase(),
  withCredentials: true,
  timeout: 12000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khalyx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Guest-Id'] = guestId();
  return config;
});

export function saveToken(token) {
  if (token) localStorage.setItem('khalyx_token', token);
}

export function clearToken() {
  localStorage.removeItem('khalyx_token');
}

export { guestId };
