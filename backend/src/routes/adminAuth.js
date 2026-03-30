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
  trimInput,
  logAudit
} from '../utils.js';

const router = express.Router();

// POST /api/admin/auth/login
router.post('/login', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = trimInput(email).toLowerCase();
    const admin = db.prepare('SELECT id, email, password_hash, is_active FROM admins WHERE email = ?').get(trimmedEmail);
    const activeAdmins = db.prepare('SELECT id, email FROM admins WHERE role = "ADMIN" AND is_active = 1').all();

    if (activeAdmins.length !== 1) {
      return res.status(403).json({ error: 'Single-admin policy violation' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (admin.email !== activeAdmins[0].email) {
      return res.status(403).json({ error: 'Only designated admin login is allowed' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: 'Admin account is inactive' });
    }

    if (!verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: admin.id,
      email: trimmedEmail,
      role: 'ADMIN'
    });

    logAudit(db, 'admin_login', trimmedEmail, admin.id, null, null, '', {});

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin.id,
        email: trimmedEmail,
        role: 'ADMIN'
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
    const admin = db.prepare('SELECT id, email FROM admins WHERE email = ? AND is_active = 1').get(normalizedEmail);
    const activeAdmins = db.prepare('SELECT id, email FROM admins WHERE role = "ADMIN" AND is_active = 1').all();

    let debugPayload = {};
    if (admin && activeAdmins.length === 1 && activeAdmins[0].email === normalizedEmail) {
      const now = getCurrentTimestamp();
      const ttlMinutes = Math.max(5, parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10) || 30);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);

      db.prepare(`
        UPDATE password_reset_tokens
        SET used_at = ?
        WHERE account_type = 'ADMIN' AND account_id = ? AND used_at IS NULL
      `).run(now, admin.id);

      db.prepare(`
        INSERT INTO password_reset_tokens (id, account_type, account_id, token_hash, expires_at, created_at)
        VALUES (?, 'ADMIN', ?, ?, ?, ?)
      `).run(generateId(), admin.id, tokenHash, expiresAt, now);

      logAudit(db, 'admin_password_reset_requested', normalizedEmail, admin.id, null, null, '', {});
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
      SELECT prt.id, prt.account_id, a.email
      FROM password_reset_tokens prt
      JOIN admins a ON a.id = prt.account_id
      WHERE prt.account_type = 'ADMIN'
        AND prt.token_hash = ?
        AND prt.used_at IS NULL
        AND prt.expires_at > ?
        AND a.is_active = 1
    `).get(tokenHash, now);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    db.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashPassword(newPassword), now, resetRecord.account_id);
    db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(now, resetRecord.id);
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE account_type = 'ADMIN' AND account_id = ? AND used_at IS NULL
    `).run(now, resetRecord.account_id);

    logAudit(db, 'admin_password_reset_completed', resetRecord.email, resetRecord.account_id, null, null, '', {});
    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    return next(err);
  }
});

export default router;
