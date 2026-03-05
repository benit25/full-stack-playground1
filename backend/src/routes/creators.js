import express from 'express';
import { getDB } from '../db.js';
import { validatePagination } from '../middleware.js';

const router = express.Router();

// GET /api/creators
router.get('/', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;

    const creators = db.prepare(`
      SELECT id, name, role, bio, location, profile_slug, social_links, is_active, created_at, updated_at
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

// GET /api/creators/:id
router.get('/:id', (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const creator = db.prepare(`
      SELECT id, name, role, bio, location, profile_slug, social_links, is_active, created_at, updated_at
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

// GET /api/creators/slug/:slug
router.get('/slug/:slug', (req, res, next) => {
  try {
    const db = getDB();
    const { slug } = req.params;

    const creator = db.prepare(`
      SELECT id, name, role, bio, location, profile_slug, social_links, is_active, created_at, updated_at
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

export default router;
