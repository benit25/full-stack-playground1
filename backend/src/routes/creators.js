import express from 'express';
import { getDB } from '../db.js';
import { validatePagination, verifyToken } from '../middleware.js';
import { getCurrentTimestamp } from '../utils.js';

const router = express.Router();

// GET /api/creators
router.get('/', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;

    const creators = db.prepare(`
      SELECT id, name, role, bio, location, profile_image_url, profile_slug, social_links, is_active, created_at, updated_at
      FROM creators
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM creators WHERE is_active = 1').get().count;

    // Parse social_links JSON
    const parsedCreators = creators.map(c => ({
      ...c,
      social_links: c.social_links ? JSON.parse(c.social_links) : {}
    }));

    res.json({
      data: parsedCreators,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/slug/:slug
router.get('/slug/:slug', (req, res, next) => {
  try {
    const db = getDB();
    const { slug } = req.params;

    const creator = db.prepare(`
      SELECT id, name, role, bio, location, profile_image_url, profile_slug, social_links, is_active, created_at, updated_at
      FROM creators
      WHERE profile_slug = ? AND is_active = 1
    `).get(slug.toLowerCase());

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    creator.social_links = creator.social_links ? JSON.parse(creator.social_links) : {};

    // Fetch creator's published content
    const content = db.prepare(`
      SELECT id, content_type, title, body, media_url, is_published, published_at, created_at, updated_at
      FROM content
      WHERE creator_id = ? AND is_published = 1
      ORDER BY published_at DESC
    `).all(creator.id);

    res.json({
      ...creator,
      content
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/:id
router.get('/:id', (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const creator = db.prepare(`
      SELECT id, name, role, bio, location, profile_image_url, profile_slug, social_links, is_active, created_at, updated_at
      FROM creators
      WHERE id = ? AND is_active = 1
    `).get(id);

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    creator.social_links = creator.social_links ? JSON.parse(creator.social_links) : {};

    // Fetch creator's published content
    const content = db.prepare(`
      SELECT id, content_type, title, body, media_url, is_published, published_at, created_at, updated_at
      FROM content
      WHERE creator_id = ? AND is_published = 1
      ORDER BY published_at DESC
    `).all(id);

    res.json({
      ...creator,
      content
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/creators/:id
router.put('/:id', verifyToken, (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { bio = '', location = '', profile_image_url = '', social_links = {} } = req.body;

    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (typeof bio !== 'string' || bio.length > 2000) {
      return res.status(400).json({ error: 'Invalid bio length' });
    }
    if (typeof location !== 'string' || location.length > 200) {
      return res.status(400).json({ error: 'Invalid location length' });
    }
    if (typeof profile_image_url !== 'string') {
      return res.status(400).json({ error: 'profile_image_url must be a string' });
    }
    const normalizedImageUrl = profile_image_url.trim();
    if (normalizedImageUrl) {
      try {
        new URL(normalizedImageUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid profile image URL' });
      }
    }
    if (typeof social_links !== 'object' || Array.isArray(social_links) || social_links === null) {
      return res.status(400).json({ error: 'social_links must be an object' });
    }

    const allowed = ['instagram', 'tiktok', 'youtube', 'x', 'website'];
    const cleaned = {};
    for (const [key, value] of Object.entries(social_links)) {
      if (!allowed.includes(key)) continue;
      if (!value) continue;
      try {
        const url = new URL(String(value).trim());
        cleaned[key] = url.toString();
      } catch {
        return res.status(400).json({ error: `Invalid URL for ${key}` });
      }
    }

    const existing = db.prepare('SELECT id FROM creators WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    db.prepare('UPDATE creators SET bio = ?, location = ?, profile_image_url = ?, social_links = ?, updated_at = ? WHERE id = ?')
      .run(bio.trim(), location.trim(), normalizedImageUrl || null, JSON.stringify(cleaned), getCurrentTimestamp(), id);

    return res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    return next(err);
  }
});

export default router;
