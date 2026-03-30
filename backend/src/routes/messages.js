import express from 'express';
import { getDB } from '../db.js';
import { verifyToken, validatePagination } from '../middleware.js';
import { generateId, getCurrentTimestamp, trimInput } from '../utils.js';

const router = express.Router();

function requireParticipant(db, conversationId, userId) {
  const row = db
    .prepare('SELECT 1 as ok FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
    .get(conversationId, userId);
  return !!row;
}

// GET /api/messages/conversations
router.get('/conversations', verifyToken, validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;
    const userId = req.user.id;

    const conversations = db.prepare(
      `
      SELECT c.id,
             c.created_at,
             (
               SELECT m.body
               FROM messages m
               WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1
             ) as last_message,
             (
               SELECT m.created_at
               FROM messages m
               WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1
             ) as last_message_at
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = ?
      ORDER BY COALESCE(last_message_at, c.created_at) DESC
      LIMIT ? OFFSET ?
      `
    ).all(userId, limit, offset);

    const data = conversations.map((c) => {
      const others = db.prepare(
        `
        SELECT cr.id, cr.name, cr.role, cr.profile_slug
        FROM conversation_participants cp
        JOIN creators cr ON cr.id = cp.user_id
        WHERE cp.conversation_id = ? AND cp.user_id != ?
        ORDER BY cr.name ASC
        `
      ).all(c.id, userId);

      return {
        id: c.id,
        created_at: c.created_at,
        last_message: c.last_message || '',
        last_message_at: c.last_message_at || c.created_at,
        participants: others
      };
    });

    return res.json({ data, pagination: { limit, offset } });
  } catch (err) {
    return next(err);
  }
});

// POST /api/messages/conversations
// Body: { peerUserId: string }
router.post('/conversations', verifyToken, (req, res, next) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const peerUserId = trimInput(req.body?.peerUserId || '');

    if (!peerUserId) {
      return res.status(400).json({ error: 'peerUserId is required' });
    }
    if (peerUserId === userId) {
      return res.status(400).json({ error: 'peerUserId must be different from your user id' });
    }

    const peer = db.prepare('SELECT id, name, role, profile_slug FROM creators WHERE id = ?').get(peerUserId);
    if (!peer) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find existing 1:1 conversation (participants exactly include both users).
    const existing = db.prepare(
      `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
      JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
      GROUP BY c.id
      LIMIT 1
      `
    ).get(userId, peerUserId);

    if (existing?.id) {
      return res.json({ data: { id: existing.id } });
    }

    const conversationId = generateId();
    const now = getCurrentTimestamp();
    db.prepare('INSERT INTO conversations (id, created_at) VALUES (?, ?)').run(conversationId, now);
    db.prepare('INSERT INTO conversation_participants (conversation_id, user_id, created_at) VALUES (?, ?, ?)').run(
      conversationId,
      userId,
      now
    );
    db.prepare('INSERT INTO conversation_participants (conversation_id, user_id, created_at) VALUES (?, ?, ?)').run(
      conversationId,
      peerUserId,
      now
    );

    return res.status(201).json({ data: { id: conversationId } });
  } catch (err) {
    return next(err);
  }
});

// GET /api/messages/conversations/:id/messages
router.get('/conversations/:id/messages', verifyToken, validatePagination, (req, res, next) => {
  try {
    const db = getDB();
    const { limit, offset } = req.pagination;
    const userId = req.user.id;
    const conversationId = req.params.id;

    if (!requireParticipant(db, conversationId, userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const rows = db.prepare(
      `
      SELECT m.id,
             m.conversation_id,
             m.sender_id,
             m.body,
             m.created_at,
             cr.name as sender_name,
             cr.role as sender_role
      FROM messages m
      JOIN creators cr ON cr.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
      `
    ).all(conversationId, limit, offset);

    return res.json({ data: rows, pagination: { limit, offset } });
  } catch (err) {
    return next(err);
  }
});

// POST /api/messages/conversations/:id/messages
// Body: { body: string }
router.post('/conversations/:id/messages', verifyToken, (req, res, next) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const conversationId = req.params.id;
    const body = trimInput(req.body?.body || '');

    if (!requireParticipant(db, conversationId, userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    if (body.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 chars)' });
    }

    const now = getCurrentTimestamp();
    const messageId = generateId();
    db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(messageId, conversationId, userId, body, now);

    return res.status(201).json({
      data: { id: messageId, conversation_id: conversationId, sender_id: userId, body, created_at: now }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

