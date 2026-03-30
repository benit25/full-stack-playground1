import { initializeDB, runAsync, getAsync } from '../db.js';
import { hashPassword, generateId, getCurrentTimestamp } from '../utils.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const media = [
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80'
];

async function ensureUser(db, { name, role, slug, email, password }) {
  const existing = await getAsync(db, 'SELECT id, creator_id FROM creator_accounts WHERE email = ?', [email]);
  if (existing) {
    return existing.creator_id;
  }

  const creatorId = generateId();
  const accountId = generateId();
  const now = getCurrentTimestamp();

  await runAsync(
    db,
    'INSERT INTO creators (id, name, role, profile_slug, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [creatorId, name, role, slug, now, now]
  );
  await runAsync(
    db,
    'INSERT INTO creator_accounts (id, creator_id, email, password_hash, is_approved, is_suspended, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 0, ?, ?)',
    [accountId, creatorId, email, hashPassword(password), now, now]
  );

  return creatorId;
}

async function seed() {
  const db = await initializeDB();
  const now = getCurrentTimestamp();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@plxyground.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Internet2026@';
  const existingAdmin = await getAsync(db, 'SELECT id FROM admins WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    await runAsync(
      db,
      'INSERT INTO admins (id, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, "ADMIN", 1, ?, ?)',
      [generateId(), adminEmail, hashPassword(adminPassword), now, now]
    );
  }

  const creatorId = await ensureUser(db, {
    name: 'Sarah Johnson',
    role: 'CREATOR',
    slug: 'sarahjohnson',
    email: process.env.CREATOR_EMAIL || 'sarahjohnson@plxyground.local',
    password: process.env.CREATOR_PASSWORD || 'Password1!'
  });

  await ensureUser(db, {
    name: 'Nike Sports',
    role: 'BUSINESS',
    slug: 'nike',
    email: process.env.BUSINESS_EMAIL || 'nike@plxyground.local',
    password: process.env.BUSINESS_PASSWORD || 'Password1!'
  });

  const existingContentCount = await getAsync(db, 'SELECT COUNT(*) as count FROM content');
  if ((existingContentCount?.count || 0) < 5) {
    const rows = [
      { title: 'Training Day 1', body: 'Full body training recap with metrics and nutrition notes.', content_type: 'article', is_published: 1, media_url: media[0] },
      { title: 'Explosive Drill Clip', body: 'Video breakdown of acceleration mechanics and warm-up flow.', content_type: 'video_embed', is_published: 1, media_url: media[1] },
      { title: 'Recovery Snapshot', body: 'Mobility routine and hydration schedule for post-game recovery.', content_type: 'image_story', is_published: 0, media_url: media[2] },
      { title: 'Weekly Nutrition Board', body: 'Meal timing and macro targets for game week preparation.', content_type: 'article', is_published: 1, media_url: media[3] },
      { title: 'Sprint Session Story', body: 'Track sprint intervals and split improvements over four weeks.', content_type: 'image_story', is_published: 0, media_url: media[4] }
    ];

    for (const row of rows) {
      const id = generateId();
      await runAsync(
        db,
        'INSERT INTO content (id, creator_id, content_type, title, body, media_url, is_published, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, creatorId, row.content_type, row.title, row.body, row.media_url, row.is_published, row.is_published ? now : null, now, now]
      );

      if (!row.is_published) {
        await runAsync(
          db,
          'INSERT INTO moderation_queue (id, type, status, title_or_name, submitted_by, entity_id, created_at, updated_at) VALUES (?, "content", "pending", ?, ?, ?, ?, ?)',
          [generateId(), row.title, process.env.CREATOR_EMAIL || 'sarahjohnson@plxyground.local', id, now, now]
        );
      }
    }
  }

  console.log('Seed complete');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Creator: ${process.env.CREATOR_EMAIL || 'sarahjohnson@plxyground.local'} / ${process.env.CREATOR_PASSWORD || 'Password1!'}`);
  console.log(`Business: ${process.env.BUSINESS_EMAIL || 'nike@plxyground.local'} / ${process.env.BUSINESS_PASSWORD || 'Password1!'}`);
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exitCode = 1;
});
