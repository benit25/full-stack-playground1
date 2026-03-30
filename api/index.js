let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../backend/src/index.js').then((mod) => mod.default);
  }
  return appPromise;
}

export default async function handler(req, res) {
  if (req.url === '/api/healthz' || req.url === '/healthz') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('Vercel handler startup failure:', err);
    return res.status(500).json({
      error: 'startup_failed',
      message: err?.message || 'Unknown startup error'
    });
  }
}
