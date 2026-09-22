import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import api from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { Product } from './models/Product.js';
import { ensureShopStructure } from './seed/seed.js';
import { uploadsDir } from './routes/admin/uploads.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [
      env.clientUrl,
      env.adminUrl,
      env.erpUrl,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175'
    ],
    credentials: true
  })
);
app.use('/uploads', express.static(uploadsDir));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Render / uptime probes often hit HEAD|GET /
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'khalyx-empire-api', health: '/api/health' });
});
app.head('/', (_req, res) => {
  res.status(200).end();
});

app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await connectDb();
  await ensureShopStructure();
  const catalog = await Product.countDocuments();
  console.log(`[api] live catalog: ${catalog} product${catalog === 1 ? '' : 's'} shared by storefront, admin, and ERP`);
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`[api] Khalyx Empire listening on http://localhost:${env.port}`);
  });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
