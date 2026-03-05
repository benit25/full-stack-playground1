import express from 'express';
import { getDB } from '../db.js';
import { validatePagination } from '../middleware.js';

const router = express.Router();

// GET /api/opportunities
router.get('/', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;

    const opportunities = db.prepare(`
      SELECT o.id, o.title, o.role_type, o.body, o.requirements, o.benefits, o.is_published, o.created_at, o.updated_at,
             cr.id as creator_id, cr.name as creator_name, cr.profile_slug
      FROM opportunities o
      LEFT JOIN creators cr ON o.creator_id = cr.id
      WHERE o.is_published = 1
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE is_published = 1').get().count;

    res.json({
      data: opportunities,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
