import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Local: /admin/ on port 5174. Vercel (own project): /
const base = process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/admin/');

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@khalyx/auth-ui': path.resolve(dir, '../../packages/auth-ui/src/index.jsx'),
      '@khalyx/ui': path.resolve(dir, '../../packages/ui/src/index.jsx')
    },
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 5174,
    open: base === '/' ? '/' : '/admin/',
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true }
    }
  }
});
