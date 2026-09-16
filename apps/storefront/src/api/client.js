import axios from 'axios';

function resolveApiBase() {
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit) return `${String(explicit).replace(/\/$/, '')}/api`;
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:5000/api';
  }
  return '/api';
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
