import express from 'express';
import { getDB } from '../db.js';
import { verifyToken, requireRole, validatePagination } from '../middleware.js';
import { generateId, getCurrentTimestamp, logAudit, escapeHtml, hashPassword } from '../utils.js';

const router = express.Router();

// Middleware: Verify admin role
router.use((req, res, next) => {
  verifyToken(req, res, () => {
    requireRole('ADMIN')(req, res, next);
  });
});

// ===== MODERATION QUEUE =====

// GET /api/admin/queue
router.get('/queue', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;
    const { status } = req.query;

    let query = 'SELECT * FROM moderation_queue';
    let params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const queue = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM moderation_queue ${status ? 'WHERE status = ?' : ''}`).get(...(status ? [status] : [])).count;

    res.json({
      data: queue,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/queue/bulk-action
router.post('/queue/bulk-action', (req, res, next) => {
  try {
    const db = getDB();
    const { ids, action, assigned_admin, reason } = req.body;

    if (!ids || !Array.isArray(ids) || !action) {
      return res.status(400).json({ error: 'ids array and action are required' });
    }

    const now = getCurrentTimestamp();
    const logId = generateId();
    let updatedCount = 0;

    // Store previous state for undo
    const previousState = db.prepare('SELECT id, status FROM moderation_queue WHERE id IN (' + ids.map(() => '?').join(',') + ')').all(...ids);

    for (const id of ids) {
      const item = db.prepare('SELECT * FROM moderation_queue WHERE id = ?').get(id);
      if (!item) continue;

      if (action === 'approve') {
        db.prepare('UPDATE moderation_queue SET status = ?, assigned_admin = ?, updated_at = ? WHERE id = ?')
          .run('approved', req.user.email, now, id);

        // If content, publish it
        if (item.type === 'content') {
          db.prepare('UPDATE content SET is_published = 1, published_at = ?, updated_at = ? WHERE id = ?')
            .run(now, now, item.entity_id);
          logAudit(db, 'content_approved', req.user.email, item.entity_id, null, null, reason || '');
        }
        updatedCount++;
      } else if (action === 'reject') {
        db.prepare('UPDATE moderation_queue SET status = ?, assigned_admin = ?, updated_at = ? WHERE id = ?')
          .run('rejected', req.user.email, now, id);
        updatedCount++;
      } else if (action === 'delete') {
        db.prepare('DELETE FROM moderation_queue WHERE id = ?').run(id);
        if (item.entity_id) {
          db.prepare('DELETE FROM content WHERE id = ?').run(item.entity_id);
        }
        updatedCount++;
      } else if (action === 'assign') {
        db.prepare('UPDATE moderation_queue SET assigned_admin = ?, updated_at = ? WHERE id = ?')
          .run(assigned_admin || req.user.email, now, id);
        updatedCount++;
      }
    }

    // Log bulk action
    db.prepare(`
      INSERT INTO bulk_action_log (id, admin, action_type, target_type, target_ids, previous_state, undo_window_expires_at, created_at)
      VALUES (?, ?, ?, 'queue_item', ?, ?, ?, ?)
    `).run(logId, req.user.email, action, JSON.stringify(ids), JSON.stringify(previousState), new Date(Date.now() + 3600000).toISOString(), now);

    res.json({
      message: `Bulk ${action} completed`,
      updatedCount
    });
  } catch (err) {
    next(err);
  }
});

// ===== CONTENT MANAGEMENT =====

// GET /api/admin/content
router.get('/content', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;

    const content = db.prepare(`
      SELECT c.id, c.content_type, c.title, c.body, c.media_url, c.is_published, c.created_at, c.updated_at,
             cr.name as creator_name, cr.id as creator_id
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM content').get().count;

    res.json({
      data: content,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/content/:id
router.put('/content/:id', (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { is_published, title, body } = req.body;

    const existing = db.prepare('SELECT * FROM content WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const now = getCurrentTimestamp();
    const updates = [];
    const params = [];

    if (is_published !== undefined) {
      updates.push('is_published = ?');
      params.push(is_published ? 1 : 0);
      if (is_published && !existing.published_at) {
        updates.push('published_at = ?');
        params.push(now);
      }
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (body !== undefined) {
      updates.push('body = ?');
      params.push(body);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    db.prepare(`UPDATE content SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    logAudit(db, 'content_admin_update', req.user.email, id, existing, { is_published, title }, '');

    res.json({ message: 'Content updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/content/:id
router.delete('/content/:id', (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM content WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' });
    }

    db.prepare('DELETE FROM content WHERE id = ?').run(id);
    logAudit(db, 'content_admin_delete', req.user.email, id, existing, null, '');

    res.json({ message: 'Content deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ===== USER MANAGEMENT =====

// GET /api/admin/users
router.get('/users', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;
    const { search } = req.query;

    let query = `
      SELECT ca.id, ca.creator_id, ca.email, ca.is_suspended, ca.is_approved, ca.created_at,
             cr.name, cr.role, cr.is_active
      FROM creator_accounts ca
      JOIN creators cr ON ca.creator_id = cr.id
    `;

    let params = [];

    if (search) {
      query += ` WHERE ca.email LIKE ? OR cr.name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY ca.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM creator_accounts ${search ? 'WHERE email LIKE ? OR ' : ''}`).get(...(search ? [`%${search}%`, `%${search}%`] : [])).count;

    res.json({
      data: users,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:userId/suspend
router.post('/users/:userId/suspend', (req, res, next) => {
  try {
    const db = getDB();
    const { userId } = req.params;
    const { reason } = req.body;

    const existing = db.prepare('SELECT * FROM creator_accounts WHERE creator_id = ?').get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = getCurrentTimestamp();
    db.prepare('UPDATE creator_accounts SET is_suspended = 1, updated_at = ? WHERE creator_id = ?').run(now, userId);

    logAudit(db, 'user_suspended', req.user.email, userId, existing, { is_suspended: 1 }, reason || 'No reason provided');

    res.json({ message: 'User suspended successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:userId/reactivate
router.post('/users/:userId/reactivate', (req, res, next) => {
  try {
    const db = getDB();
    const { userId } = req.params;

    const existing = db.prepare('SELECT * FROM creator_accounts WHERE creator_id = ?').get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = getCurrentTimestamp();
    db.prepare('UPDATE creator_accounts SET is_suspended = 0, updated_at = ? WHERE creator_id = ?').run(now, userId);

    logAudit(db, 'user_reactivated', req.user.email, userId, existing, { is_suspended: 0 }, '');

    res.json({ message: 'User reactivated successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:userId/verify
router.post('/users/:userId/verify', (req, res, next) => {
  try {
    const db = getDB();
    const { userId } = req.params;

    const existing = db.prepare('SELECT * FROM creator_accounts WHERE creator_id = ?').get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = getCurrentTimestamp();
    db.prepare('UPDATE creator_accounts SET is_approved = 1, updated_at = ? WHERE creator_id = ?').run(now, userId);

    logAudit(db, 'user_verified', req.user.email, userId, existing, { is_approved: 1 }, '');

    res.json({ message: 'User verified successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:userId/reset-password
router.post('/users/:userId/reset-password', (req, res, next) => {
  try {
    const db = getDB();
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = db.prepare('SELECT * FROM creator_accounts WHERE creator_id = ?').get(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = hashPassword(newPassword);
    const now = getCurrentTimestamp();
    db.prepare('UPDATE creator_accounts SET password_hash = ?, updated_at = ? WHERE creator_id = ?').run(passwordHash, now, userId);

    logAudit(db, 'user_password_reset', req.user.email, userId, null, { password_reset: true }, 'Admin-initiated');

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// ===== AUDIT LOG =====

// GET /api/admin/audit
router.get('/audit', validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;

    const logs = db.prepare(`
      SELECT id, action_type, actor, target, before_snapshot, after_snapshot, reason, metadata, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count;

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      before_snapshot: log.before_snapshot ? JSON.parse(log.before_snapshot) : null,
      after_snapshot: log.after_snapshot ? JSON.parse(log.after_snapshot) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
    }));

    res.json({
      data: parsedLogs,
      pagination: { limit, offset, total }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit/export
router.get('/audit/export', (req, res, next) => {
  try {
    const db = getDB();

    const logs = db.prepare(`
      SELECT id, action_type, actor, target, before_snapshot, after_snapshot, reason, metadata, created_at
      FROM audit_log
      ORDER BY created_at DESC
    `).all();

    const csv = [
      'ID,Action,Actor,Target,Reason,Created At',
      ...logs.map(log => `"${log.id}","${log.action_type}","${log.actor || ''}","${log.target || ''}","${log.reason || ''}","${log.created_at}"`)
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ===== ANALYTICS =====

// GET /api/admin/analytics
router.get('/analytics', (req, res, next) => {
  try {
    const db = getDB();

    const totalCreators = db.prepare('SELECT COUNT(*) as count FROM creators WHERE role = "CREATOR" AND is_active = 1').get().count;
    const totalBusinesses = db.prepare('SELECT COUNT(*) as count FROM creators WHERE role = "BUSINESS" AND is_active = 1').get().count;
    const totalContent = db.prepare('SELECT COUNT(*) as count FROM content').get().count;
    const publishedContent = db.prepare('SELECT COUNT(*) as count FROM content WHERE is_published = 1').get().count;
    const pendingContent = db.prepare('SELECT COUNT(*) as count FROM content WHERE is_published = 0').get().count;

    const last7DaysContent = db.prepare(`
      SELECT COUNT(*) as count FROM content
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    // Weekly trend data
    const weeklyTrend = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM content
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    res.json({
      kpis: {
        totalCreators,
        totalBusinesses,
        totalContent,
        publishedContent,
        pendingContent,
        last7DaysContent
      },
      weeklyTrend,
      isMockData: false
    });
  } catch (err) {
    next(err);
  }
});

// ===== LIVE ALERTS =====

// GET /api/admin/alerts
router.get('/alerts', (req, res, next) => {
  try {
    const db = getDB();

    const recentContent = db.prepare(`
      SELECT 'new_content' as type, c.id, c.title as title_or_name, cr.name as creator_name, c.created_at
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.created_at >= datetime('now', '-24 hours')
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all();

    const recentUsers = db.prepare(`
      SELECT 'new_user' as type, ca.id, cr.name as title_or_name, ca.email, ca.created_at
      FROM creator_accounts ca
      JOIN creators cr ON ca.creator_id = cr.id
      WHERE ca.created_at >= datetime('now', '-24 hours')
      ORDER BY ca.created_at DESC
      LIMIT 10
    `).all();

    const alerts = [...recentContent, ...recentUsers]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    res.json({
      data: alerts,
      isMockData: false,
      timestamp: getCurrentTimestamp()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
