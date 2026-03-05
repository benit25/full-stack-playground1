import express from 'express';
import { getDB } from '../db.js';
import { verifyToken, authLimiter } from '../middleware.js';
import { hashPassword, verifyPassword, generateToken, generateId, getCurrentTimestamp, trimInput } from '../utils.js';

const router = express.Router();

// POST /api/auth/signup - Creator signup
router.post('/signup', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email, password, name, slug } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const trimmedEmail = trimInput(email).toLowerCase();
    const trimmedPassword = password;
    const trimmedName = trimInput(name);
    const finalSlug = slug ? trimInput(slug).toLowerCase() : trimmedEmail.split('@')[0];

    if (trimmedPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email exists
    const existingAccount = db.prepare('SELECT id FROM creator_accounts WHERE email = ?').get(trimmedEmail);
    if (existingAccount) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create creator and account
    const creatorId = generateId();
    const accountId = generateId();
    const now = getCurrentTimestamp();
    const passwordHash = hashPassword(trimmedPassword);

    db.prepare(`
      INSERT INTO creators (id, name, role, profile_slug, is_active, created_at, updated_at)
      VALUES (?, ?, 'CREATOR', ?, 1, ?, ?)
    `).run(creatorId, trimmedName, finalSlug, now, now);

    db.prepare(`
      INSERT INTO creator_accounts (id, creator_id, email, password_hash, is_approved, is_suspended, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `).run(accountId, creatorId, trimmedEmail, passwordHash, now, now);

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (id, action_type, actor, target, after_snapshot, metadata, created_at)
      VALUES (?, 'creator_signup', ?, ?, ?, ?, ?)
    `).run(generateId(), trimmedEmail, creatorId, JSON.stringify({ email: trimmedEmail, name: trimmedName }), '{}', now);

    const creator = db.prepare('SELECT id, name, role FROM creators WHERE id = ?').get(creatorId);
    const token = generateToken({
      id: creatorId,
      email: trimmedEmail,
      role: 'CREATOR'
    });

    res.status(201).json({
      message: 'Creator account created successfully',
      token,
      user: {
        id: creator.id,
        email: trimmedEmail,
        name: creator.name,
        role: creator.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - Creator login
router.post('/login', authLimiter, (req, res, next) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = trimInput(email).toLowerCase();
    const account = db.prepare('SELECT id, creator_id, password_hash, is_suspended FROM creator_accounts WHERE email = ?').get(trimmedEmail);

    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (account.is_suspended) {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended' });
    }

    // Validate password hash exists and is a string
    if (!account.password_hash || typeof account.password_hash !== 'string') {
      console.error('[Auth] Invalid password hash format:', { email, accountId: account.id, hashType: typeof account.password_hash });
      return res.status(500).json({ error: 'Authentication error' });
    }

    if (!verifyPassword(password, account.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const creator = db.prepare('SELECT id, name, role FROM creators WHERE id = ?').get(account.creator_id);
    const token = generateToken({
      id: creator.id,
      email: trimmedEmail,
      role: creator.role
    });

    const now = getCurrentTimestamp();
    db.prepare(`
      INSERT INTO audit_log (id, action_type, actor, target, metadata, created_at)
      VALUES (?, 'creator_login', ?, ?, ?, ?)
    `).run(generateId(), trimmedEmail, creator.id, '{}', now);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: creator.id,
        email: trimmedEmail,
        name: creator.name,
        role: creator.role
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
