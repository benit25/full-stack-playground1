import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDB } from './db.js';
import { logRequest, errorHandler, apiLimiter } from './middleware.js';
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import creatorRoutes from './routes/creators.js';
import contentRoutes from './routes/content.js';
import opportunitiesRoutes from './routes/opportunities.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3011;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDB();

    // Security & middleware
    app.use(helmet());
    app.use(cors({
      origin: (process.env.CORS_ORIGIN || 'http://localhost:19006').split(','),
      credentials: true
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Rate limiting
    app.use(apiLimiter);

    // Request logging
    app.use(logRequest);

    // Health check
    app.get('/healthz', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/', (req, res) => {
      res.json({
        name: 'PLXYGROUND API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/healthz',
          auth: '/api/auth',
          creators: '/api/creators',
          content: '/api/content',
          opportunities: '/api/opportunities',
          admin: '/api/admin'
        }
      });
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/admin/auth', adminAuthRoutes);
    app.use('/api/creators', creatorRoutes);
    app.use('/api/content', contentRoutes);
    app.use('/api/opportunities', opportunitiesRoutes);
    app.use('/api/admin', adminRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🏀 PLXYGROUND BACKEND STARTED        ║
║   Port: ${PORT}                           ║
║   Database: Initialized                ║
║   Status: Ready                        ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
