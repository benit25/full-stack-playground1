import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

// Auth middleware
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const user = jwt.verify(token, getJwtSecret());
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalVerifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: requires ${role} role` });
    }
    next();
  };
}

// Validation middleware
export function validatePagination(req, res, next) {
  let limit = parseInt(req.query.limit || '20', 10);
  let offset = parseInt(req.query.offset || '0', 10);

  // Public routes allow max 100, admin routes allow up to 2000
  const maxLimit = req.user?.role === 'ADMIN' ? 2000 : 100;

  if (!Number.isFinite(limit) || limit < 1 || limit > maxLimit) {
    return res.status(400).json({ error: `limit must be between 1 and ${maxLimit}` });
  }
  if (!Number.isFinite(offset) || offset < 0) {
    return res.status(400).json({ error: 'offset must be 0 or greater' });
  }

  req.pagination = { limit, offset };
  next();
}

export function validateContentCreate(req, res, next) {
  const { content_type, title, body, media_url } = req.body;

  if (!content_type || !['article', 'video_embed', 'image_story'].includes(content_type)) {
    return res.status(400).json({ error: 'Invalid or missing content_type' });
  }
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: 'Body is required' });
  }
  if (!media_url || media_url.trim().length === 0) {
    return res.status(400).json({ error: 'Media URL is required' });
  }

  // Validate media URL format
  try {
    new URL(media_url);
  } catch {
    return res.status(400).json({ error: 'Invalid media URL format' });
  }

  next();
}

// Error handler middleware
export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.message.includes('UNIQUE constraint')) {
    return res.status(409).json({ error: 'Resource already exists (duplicate)' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Request logging middleware
export function logRequest(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
}

// Rate limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { error: 'Too many auth attempts, please try again later' }
});

export const createContentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 create requests per minute
  message: { error: 'Creating content too rapidly, slow down' },
  skip: (req) => req.user?.role === 'ADMIN' // admins unlimited
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});
