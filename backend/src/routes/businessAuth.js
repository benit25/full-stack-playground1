import express from 'express';
import { getDB } from '../db.js';
import { authLimiter } from '../middleware.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateId,
  generateSecureToken,
  hashToken,
  getCurrentTimestamp,
  trimInput
} from '../utils.js';

const router = express.Router();

router.post('/signup', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email, password, name, slug } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and business name are required' });
    }

    const normalizedEmail = trimInput(email).toLowerCase();
    const finalSlug = slug ? trimInput(slug).toLowerCase() : normalizedEmail.split('@')[0];

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingAccount = db.prepare('SELECT id FROM creator_accounts WHERE email = ?').get(normalizedEmail);
    if (existingAccount) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const creatorId = generateId();
    const accountId = generateId();
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO creators (id, name, role, profile_slug, is_active, created_at, updated_at)
      VALUES (?, ?, 'BUSINESS', ?, 1, ?, ?)
    `).run(creatorId, trimInput(name), finalSlug, now, now);

    db.prepare(`
      INSERT INTO creator_accounts (id, creator_id, email, password_hash, is_approved, is_suspended, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `).run(accountId, creatorId, normalizedEmail, hashPassword(password), now, now);

    const token = generateToken({
      id: creatorId,
      email: normalizedEmail,
      role: 'BUSINESS'
    });

    res.status(201).json({
      message: 'Business account created successfully',
      token,
      user: {
        id: creatorId,
        email: normalizedEmail,
        name: trimInput(name),
        role: 'BUSINESS'
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = trimInput(email).toLowerCase();
    const account = db.prepare(`
      SELECT ca.id, ca.creator_id, ca.password_hash, ca.is_suspended, cr.role, cr.name
      FROM creator_accounts ca
      JOIN creators cr ON ca.creator_id = cr.id
      WHERE ca.email = ?
    `).get(normalizedEmail);

    if (!account || account.role !== 'BUSINESS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (account.is_suspended) {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended by an administrator' });
    }

    if (!verifyPassword(password, account.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: account.creator_id,
      email: normalizedEmail,
      role: 'BUSINESS'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: account.creator_id,
        email: normalizedEmail,
        name: account.name,
        role: 'BUSINESS'
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = trimInput(email).toLowerCase();
    const account = db.prepare(`
      SELECT ca.id as account_id, ca.creator_id
      FROM creator_accounts ca
      JOIN creators cr ON cr.id = ca.creator_id
      WHERE ca.email = ? AND cr.role = 'BUSINESS'
    `).get(normalizedEmail);

    let debugPayload = {};
    if (account) {
      const now = getCurrentTimestamp();
      const ttlMinutes = Math.max(5, parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10) || 30);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);

      db.prepare(`
        UPDATE password_reset_tokens
        SET used_at = ?
        WHERE account_type = 'BUSINESS' AND account_id = ? AND used_at IS NULL
      `).run(now, account.account_id);

      db.prepare(`
        INSERT INTO password_reset_tokens (id, account_type, account_id, token_hash, expires_at, created_at)
        VALUES (?, 'BUSINESS', ?, ?, ?, ?)
      `).run(generateId(), account.account_id, tokenHash, expiresAt, now);

      db.prepare(`
        INSERT INTO audit_log (id, action_type, actor, target, metadata, created_at)
        VALUES (?, 'business_password_reset_requested', ?, ?, ?, ?)
      `).run(generateId(), normalizedEmail, account.creator_id, '{}', now);

      if (process.env.LOCAL_STUB_EMAIL === 'true') {
        debugPayload = { resetToken: token, resetTokenExpiresAt: expiresAt };
      }
    }

    return res.json({
      message: 'If an account exists for that email, reset instructions have been sent.',
      ...debugPayload
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset-password', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashToken(token);
    const now = getCurrentTimestamp();
    const resetRecord = db.prepare(`
      SELECT prt.id, prt.account_id, ca.creator_id, ca.email
      FROM password_reset_tokens prt
      JOIN creator_accounts ca ON ca.id = prt.account_id
      JOIN creators cr ON cr.id = ca.creator_id
      WHERE prt.account_type = 'BUSINESS'
        AND prt.token_hash = ?
        AND prt.used_at IS NULL
        AND prt.expires_at > ?
        AND cr.role = 'BUSINESS'
    `).get(tokenHash, now);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    db.prepare('UPDATE creator_accounts SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashPassword(newPassword), now, resetRecord.account_id);
    db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(now, resetRecord.id);
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE account_type = 'BUSINESS' AND account_id = ? AND used_at IS NULL
    `).run(now, resetRecord.account_id);
    db.prepare(`
      INSERT INTO audit_log (id, action_type, actor, target, metadata, created_at)
      VALUES (?, 'business_password_reset_completed', ?, ?, ?, ?)
    `).run(generateId(), resetRecord.email, resetRecord.creator_id, '{}', now);

    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
