import express from 'express';
import { getDB } from '../db.js';
import { authLimiter } from '../middleware.js';
import { hashPassword, verifyPassword, generateToken, generateId, getCurrentTimestamp, trimInput, logAudit } from '../utils.js';

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

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
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

export default router;
