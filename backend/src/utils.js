import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateId() {
  return crypto.randomUUID();
}

export function generateSecureToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function trimInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim();
}

export function logAudit(db, actionType, actor, target, beforeSnapshot, afterSnapshot, reason = '', metadata = {}) {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO audit_log (id, action_type, actor, target, before_snapshot, after_snapshot, reason, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    actionType,
    actor,
    target,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
    afterSnapshot ? JSON.stringify(afterSnapshot) : null,
    reason,
    JSON.stringify(metadata),
    timestamp
  );

  return id;
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  generateId,
  generateSecureToken,
  hashToken,
  getCurrentTimestamp,
  escapeHtml,
  trimInput,
  logAudit
};
