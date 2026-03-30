import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initializeDB } from './db.js';
import { logRequest, errorHandler, apiLimiter } from './middleware.js';
import authRoutes from './routes/auth.js';
import businessAuthRoutes from './routes/businessAuth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import creatorRoutes from './routes/creators.js';
import contentRoutes from './routes/content.js';
import opportunitiesRoutes from './routes/opportunities.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3011', 10);
const HOST = process.env.HOST || '127.0.0.1';
let dbReadyPromise = null;

function isPrivateHostname(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m) {
    const secondOctet = parseInt(m[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

function ensureDatabaseReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = initializeDB().catch((err) => {
      dbReadyPromise = null;
      throw err;
    });
  }
  return dbReadyPromise;
}

app.use(helmet());
const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:19006')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const devExtraOrigins = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];
const allowedOrigins = Array.from(new Set([...configuredOrigins, ...devExtraOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    if ((process.env.NODE_ENV || 'development') !== 'production') {
      try {
        const { hostname } = new URL(origin);
        if (isPrivateHostname(hostname)) return callback(null, true);
      } catch {
        // ignore parse errors
      }
    }

    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(apiLimiter);
app.use(logRequest);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({
    name: 'PLXYGROUND API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/healthz',
      auth: '/api/auth',
      messages: '/api/messages',
      creators: '/api/creators',
      content: '/api/content',
      opportunities: '/api/opportunities',
      admin: '/api/admin'
    },
    web: {
      app: '/app',
      admin_panel: '/admin'
    }
  });
});

app.use((req, res, next) => {
  if (req.path === '/healthz' || req.path === '/api/healthz' || req.path === '/') {
    return next();
  }

  ensureDatabaseReady()
    .then(() => next())
    .catch(next);
});

app.use('/api/auth', authRoutes);
app.use('/api/business/auth', businessAuthRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

const repoRoot = path.resolve(process.cwd(), '..');
const frontendDist = path.join(repoRoot, 'frontend', 'dist');
const adminDist = path.join(repoRoot, 'admin-panel', 'dist');

if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  const frontendAssets = path.join(frontendDist, 'assets');
  if (fs.existsSync(frontendAssets)) {
    app.use('/assets', express.static(frontendAssets));
  }

  app.use('/app', express.static(frontendDist));
  app.get('/app/*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

if (fs.existsSync(path.join(adminDist, 'index.html'))) {
  const adminAssets = path.join(adminDist, 'assets');
  if (fs.existsSync(adminAssets)) {
    app.use('/admin/assets', express.static(adminAssets));
  }

  const rawAdminIndex = fs.readFileSync(path.join(adminDist, 'index.html'), 'utf8');
  const rewrittenAdminIndex = rawAdminIndex.replace(/(["'])\/assets\//g, '$1/admin/assets/');

  app.get('/admin', (req, res) => res.type('html').send(rewrittenAdminIndex));
  app.get('/admin/', (req, res) => res.type('html').send(rewrittenAdminIndex));
  app.get('/admin/*', (req, res) => res.type('html').send(rewrittenAdminIndex));
}

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use(errorHandler);

if (!process.env.VERCEL) {
  ensureDatabaseReady()
    .then(() => {
      app.listen(PORT, HOST, () => {
        console.log(`
╔════════════════════════════════════════╗
║   🏀 PLXYGROUND BACKEND STARTED        ║
║   Port: ${PORT}                           ║
║   Database: Initialized                ║
║   Status: Ready                        ║
╚════════════════════════════════════════╝
      `);

        const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
        console.log(`Listening on http://${displayHost}:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    });
}

export default app;
