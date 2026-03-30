import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function resolveSqlitePath() {
  const configured = (process.env.DATABASE_URL || '').trim();

  if (configured) {
    if (path.isAbsolute(configured)) {
      return configured;
    }
    return path.resolve(process.cwd(), configured);
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/plxyground.db';
  }

  return path.resolve(process.cwd(), 'plxyground.db');
}

const dbPath = resolveSqlitePath();

let dbInstance = null;
let SQL = null;

async function getSQL() {
  if (!SQL) {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    SQL = await initSqlJs({
      locateFile: (file) => {
        if (file === 'sql-wasm.wasm') {
          return wasmPath;
        }
        return file;
      }
    });
  }
  return SQL;
}

function ensureSchemaUpgrades(db) {
  const upgrades = [
    `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      account_type TEXT CHECK(account_type IN ('CREATOR', 'BUSINESS', 'ADMIN')) NOT NULL,
      account_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    )
    `,
    'CREATE INDEX IF NOT EXISTS idx_password_reset_lookup ON password_reset_tokens(account_type, account_id, used_at)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON password_reset_tokens(expires_at)',

    // Messaging (1:1 + group-ready)
    `
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES creators(id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES creators(id)
    )
    `,
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id)'
  ];

  for (const statement of upgrades) {
    db.run(statement);
  }

  // Backward-compatible column add for existing databases
  const creatorTableInfo = db.exec('PRAGMA table_info(creators)');
  const creatorCols = creatorTableInfo?.[0]?.values?.map((row) => row[1]) || [];
  if (!creatorCols.includes('profile_image_url')) {
    db.run('ALTER TABLE creators ADD COLUMN profile_image_url TEXT');
  }
}

export async function initializeDB() {
  if (dbInstance) return dbInstance;

  try {
    // Initialize SQL.js
    const SQL = await getSQL();

    // Load or create database
    let data;
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath);
    }

    const db = new SQL.Database(data);
    dbInstance = db;

    // Create schema if needed
    const tables = db.exec('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1');
    if (!tables || tables.length === 0) {
      createSchema(db);
    }
    ensureSchemaUpgrades(db);
    saveDB(db);

    console.log(`✓ Database initialized at ${dbPath}`);
    return db;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

function createSchema(db) {
  const schema = `
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('CREATOR', 'BUSINESS')) DEFAULT 'CREATOR',
      bio TEXT,
      location TEXT,
      profile_image_url TEXT,
      profile_slug TEXT UNIQUE,
      social_links TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creator_accounts (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_approved INTEGER DEFAULT 1,
      is_suspended INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES creators(id)
    );

    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      content_type TEXT CHECK(content_type IN ('article', 'video_embed', 'image_story')) NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      media_url TEXT NOT NULL,
      order_priority INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      feed_rank_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES creators(id)
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      creator_id TEXT,
      title TEXT NOT NULL,
      role_type TEXT,
      body TEXT,
      requirements TEXT,
      benefits TEXT,
      is_published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES creators(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_queue (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('content', 'user', 'report')) DEFAULT 'content',
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      title_or_name TEXT,
      submitted_by TEXT,
      report_count INTEGER DEFAULT 0,
      assigned_admin TEXT,
      entity_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      actor TEXT,
      target TEXT,
      before_snapshot TEXT,
      after_snapshot TEXT,
      reason TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bulk_action_log (
      id TEXT PRIMARY KEY,
      admin TEXT,
      action_type TEXT,
      target_type TEXT,
      target_ids TEXT,
      previous_state TEXT,
      undo_window_expires_at TEXT,
      created_at TEXT NOT NULL,
      undone_at TEXT
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      account_type TEXT CHECK(account_type IN ('CREATOR', 'BUSINESS', 'ADMIN')) NOT NULL,
      account_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_creator_id ON content(creator_id);
    CREATE INDEX IF NOT EXISTS idx_content_published ON content(is_published);
    CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
    CREATE INDEX IF NOT EXISTS idx_creator_accounts_email ON creator_accounts(email);
    CREATE INDEX IF NOT EXISTS idx_password_reset_lookup ON password_reset_tokens(account_type, account_id, used_at);
    CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON password_reset_tokens(expires_at);
  `;

  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      db.run(stmt);
    }
    saveDB(db);
  } catch (err) {
    console.error('Schema creation error:', err);
  }
}

function saveDB(db) {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Async helpers for sql.js
export async function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      saveDB(db);
      resolve({ changes: 1 });
    } catch (err) {
      reject(err);
    }
  });
}

export async function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const values = stmt.get();
        row = {};
        cols.forEach((col, i) => {
          row[col] = values[i];
        });
      }
      stmt.free();
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
}

export async function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      const cols = stmt.getColumnNames();
      
      while (stmt.step()) {
        const values = stmt.get();
        const row = {};
        cols.forEach((col, i) => {
          row[col] = values[i];
        });
        rows.push(row);
      }
      stmt.free();
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

export function getDB() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDB() first.');
  }
  
  // Wrap the db instance to provide better-sqlite3 like API
  return {
    // Wrap prepare to return an object with .get(), .run(), .all() methods
    prepare: (sql) => {
      return {
        get: (...params) => {
          try {
            const stmt = dbInstance.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
              const cols = stmt.getColumnNames();
              const values = stmt.get();
              const row = {};
              cols.forEach((col, i) => {
                row[col] = values[i];
              });
              stmt.free();
              return row;
            }
            stmt.free();
            return null;
          } catch (err) {
            console.error('DB.prepare.get error:', err);
            return null;
          }
        },
        run: (...params) => {
          try {
            const stmt = dbInstance.prepare(sql);
            stmt.bind(params);
            stmt.step();
            stmt.free();
            saveDB(dbInstance);
            return { changes: 1 };
          } catch (err) {
            console.error('DB.prepare.run error:', err);
            throw err;
          }
        },
        all: (...params) => {
          try {
            const stmt = dbInstance.prepare(sql);
            stmt.bind(params);
            const rows = [];
            const cols = stmt.getColumnNames();
            while (stmt.step()) {
              const values = stmt.get();
              const row = {};
              cols.forEach((col, i) => {
                row[col] = values[i];
              });
              rows.push(row);
            }
            stmt.free();
            return rows;
          } catch (err) {
            console.error('DB.prepare.all error:', err);
            return [];
          }
        }
      };
    },
    // For exec (used in initialization)
    exec: (sql) => {
      const statements = sql.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        try {
          const prepared = dbInstance.prepare(stmt);
          prepared.step();
          prepared.free();
        } catch (err) {
          // Ignore errors for CREATE TABLE IF NOT EXISTS
          if (!err.message.includes('already exists')) {
            console.warn('DB.exec warning:', err.message);
          }
        }
      }
    }
  };
}

export default { initializeDB, getDB, runAsync, getAsync, allAsync };
