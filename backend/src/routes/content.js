import express from 'express';
import { getDB } from '../db.js';
import { verifyToken, validatePagination, validateContentCreate } from '../middleware.js';
import { generateId, getCurrentTimestamp, logAudit, escapeHtml } from '../utils.js';

const router = express.Router();

// GET /api/content - Public feed
router.get('/', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;
    const { search } = req.query;

    let query = `
      SELECT c.id, c.content_type, c.title, c.body, c.media_url, c.is_published, c.published_at, c.created_at, c.updated_at,
             cr.id as creator_id, cr.name as creator_name, cr.profile_slug
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.is_published = 1 AND cr.is_active = 1
    `;

    let params = [];

    if (search) {
      query += ` AND (c.title LIKE ? OR cr.name LIKE ? OR c.body LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.published_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const content = db.prepare(query).all(...params);
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.is_published = 1 AND cr.is_active = 1
      ${search ? "AND (c.title LIKE ? OR cr.name LIKE ? OR c.body LIKE ?)" : ""}
    `).get(...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])).count;

    res.json({
      data: content,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/:id
router.get('/:id', (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const content = db.prepare(`
      SELECT c.id, c.content_type, c.title, c.body, c.media_url, c.is_published, c.published_at, c.created_at, c.updated_at,
             cr.id as creator_id, cr.name as creator_name, cr.profile_slug, cr.bio, cr.location
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.id = ?
    `).get(id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if published or requester is owner/admin
    if (!content.is_published && (!req.user || (req.user.id !== content.creator_id && req.user.role !== 'ADMIN'))) {
      return res.status(403).json({ error: 'Content not available' });
    }

    res.json(content);
  } catch (err) {
    next(err);
  }
});

// POST /api/content - Create content
router.post('/', verifyToken, validateContentCreate, (req, res, next) => {
  try {
    const db = getDB();
    const { content_type, title, body, media_url, is_published } = req.body;

    const contentId = generateId();
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO content (id, creator_id, content_type, title, body, media_url, is_published, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contentId,
      req.user.id,
      content_type,
      title,
      body,
      media_url,
      is_published ? 1 : 0,
      is_published ? now : null,
      now,
      now
    );

    // Add to moderation queue if not auto-published
    if (!is_published) {
      const queueId = generateId();
      db.prepare(`
        INSERT INTO moderation_queue (id, type, status, title_or_name, submitted_by, entity_id, created_at, updated_at)
        VALUES (?, 'content', 'pending', ?, ?, ?, ?, ?)
      `).run(queueId, title, req.user.email, contentId, now, now);
    }

    logAudit(db, 'content_create', req.user.email, contentId, null, { title, content_type }, 'Auto-published: ' + (is_published ? 'yes' : 'no'));

    res.status(201).json({
      message: 'Content created successfully',
      id: contentId,
      is_published: !!is_published
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/content/:id - Update content
router.put('/:id', verifyToken, validateContentCreate, (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { content_type, title, body, media_url, is_published } = req.body;

    const existing = db.prepare('SELECT creator_id, is_published FROM content WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (existing.creator_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE content
      SET content_type = ?, title = ?, body = ?, media_url = ?, is_published = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      content_type,
      title,
      body,
      media_url,
      is_published ? 1 : 0,
      is_published ? now : null,
      now,
      id
    );

    logAudit(db, 'content_update', req.user.email, id, existing, { title, content_type }, '');

    res.json({ message: 'Content updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/content/:id
router.delete('/:id', verifyToken, (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const existing = db.prepare('SELECT creator_id FROM content WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (existing.creator_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM content WHERE id = ?').run(id);

    logAudit(db, 'content_delete', req.user.email, id, null, null, 'User-initiated delete');

    res.json({ message: 'Content deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
