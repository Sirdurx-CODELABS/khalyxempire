import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDbPath = path.resolve(__dirname, '../../.mongo-catalog');
const LOCAL_DB = process.env.MONGODB_DB || 'test';
const LOCAL_URI = `mongodb://127.0.0.1:27018/${LOCAL_DB}`;

let memoryServer;

async function tryExistingLocal() {
  try {
    await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 1200 });
    return true;
  } catch {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    return false;
  }
}

function clearStaleLocks() {
  for (const name of ['mongod.lock', 'WiredTiger.lock']) {
    try {
      fs.rmSync(path.join(localDbPath, name), { force: true });
    } catch {
      /* ignore */
    }
  }
}

async function startEphemeralMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'khalyx' } });
  return memoryServer.getUri();
}

async function createPersistentMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(localDbPath, { recursive: true });
  clearStaleLocks();
  memoryServer = await MongoMemoryServer.create({
    instance: {
      port: 27018,
      dbName: 'khalyx',
      dbPath: localDbPath,
      storageEngine: 'wiredTiger'
    }
  });
  return memoryServer.getUri();
}

async function startLocalMongo() {
  try {
    return await createPersistentMongo();
  } catch (err) {
    console.warn(`[db] persistent local Mongo failed (${err.message}); resetting data directory`);
    try {
      fs.rmSync(localDbPath, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    try {
      return await createPersistentMongo();
    } catch (retryErr) {
      console.warn(`[db] reset failed (${retryErr.message}); using in-memory catalog`);
      return startEphemeralMongo();
    }
  }
}

async function connectLocal() {
  if (await tryExistingLocal()) {
    console.log('[db] reused local MongoDB on port 27018 (admin, storefront, and ERP share this catalog)');
    return;
  }

  try {
    const uri = await startLocalMongo();
    await mongoose.connect(uri, { dbName: LOCAL_DB });
    console.log(`[db] connected local (${mongoose.connection.name || LOCAL_DB})`);
  } catch (err) {
    console.warn(`[db] local Mongo start failed (${err.message}); retrying after clearing locks`);
    clearStaleLocks();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (await tryExistingLocal()) {
      console.log('[db] reused local MongoDB on port 27018');
      return;
    }
    const uri = await startEphemeralMongo();
    await mongoose.connect(uri);
    console.warn('[db] using in-memory MongoDB — storefront, admin, and ERP still share one catalog');
    console.log(`[db] connected (${mongoose.connection.name || 'khalyx'})`);
  }
}

function hasLocalCatalog() {
  return fs.existsSync(path.join(localDbPath, 'WiredTiger'));
}

export async function connectDb() {
  mongoose.set('strictQuery', true);

  // Restarts should be instant: if the local catalog is already up, use it
  // instead of waiting on Atlas (this network often blocks the cluster IP).
  if (await tryExistingLocal()) {
    console.log('[db] reused local MongoDB on port 27018 (admin, storefront, and ERP share this catalog)');
    return;
  }

  if (hasLocalCatalog()) {
    await connectLocal();
    return;
  }

  if (env.mongoUri) {
    try {
      const options = {
        serverSelectionTimeoutMS: 2500,
        ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {})
      };
      await mongoose.connect(env.mongoUri, options);
      console.log(
        `[db] connected (${mongoose.connection.name}) — storefront, admin, and ERP read this same catalog`
      );
      return;
    } catch (err) {
      console.warn(`[db] Atlas unreachable (${err.message}). Starting a local catalog so the apps can run.`);
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  await connectLocal();
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
