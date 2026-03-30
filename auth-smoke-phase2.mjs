import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const repoRoot = path.resolve('.');
const require = createRequire(import.meta.url);
const jwt = require(path.join(repoRoot, 'backend/node_modules/jsonwebtoken'));

function readEnvFile(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnvFile(path.join(repoRoot, '.env'));
process.chdir(path.join(repoRoot, 'backend'));
const dbModuleUrl = pathToFileURL(path.join(repoRoot, 'backend/src/db.js')).href;
const { initializeDB, getDB } = await import(dbModuleUrl);
await initializeDB();
const db = getDB();

const seededAdmin = db.prepare(
  'SELECT id, email FROM admins WHERE role = "ADMIN" AND is_active = 1 ORDER BY created_at ASC LIMIT 1'
).get();
const adminToken = jwt.sign({ id: seededAdmin.id, email: seededAdmin.email, role: 'ADMIN' }, env.JWT_SECRET, {
  expiresIn: '2h'
});

const results = [];

async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (options.expected && !options.expected.includes(response.status)) {
    const error = new Error(`Expected ${options.expected.join('/')} but got ${response.status}`);
    error.response = { status: response.status, data };
    throw error;
  }
  return { status: response.status, data };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ status: 'PASS', name, detail });
    console.log(`[PASS] ${name} - ${detail}`);
  } catch (error) {
    results.push({ status: 'FAIL', name, detail: error.message, evidence: error.response });
    console.log(`[FAIL] ${name} - ${error.message}`);
    throw error;
  }
}

const userSearch = await request('http://127.0.0.1:3011/api/admin/users?search=smoke_creator_&limit=200', {
  token: adminToken,
  expected: [200]
});
const smokeCreator = userSearch.data.data[0];
const creatorEmail = smokeCreator.email;
const creatorId = smokeCreator.creator_id;
const adminResetPassword = 'AdminReset123!';
const forgotResetPassword = 'ForgotReset123!';

await step('Suspend latest smoke creator', async () => {
  await request(`http://127.0.0.1:3011/api/admin/users/${creatorId}/suspend`, {
    method: 'POST',
    token: adminToken,
    body: { reason: 'Phase 2 suspend verification' },
    expected: [200]
  });
  return creatorEmail;
});

await step('Suspended creator login is rejected', async () => {
  const res = await request('http://127.0.0.1:3011/api/auth/login', {
    method: 'POST',
    body: { email: creatorEmail, password: 'SmokePass123!' },
    expected: [403]
  });
  if (res.data.error !== 'ACCOUNT_SUSPENDED') {
    throw new Error('Expected ACCOUNT_SUSPENDED response');
  }
  return 'Login returned ACCOUNT_SUSPENDED';
});

await step('Reactivate latest smoke creator', async () => {
  await request(`http://127.0.0.1:3011/api/admin/users/${creatorId}/reactivate`, {
    method: 'POST',
    token: adminToken,
    body: {},
    expected: [200]
  });
  return creatorEmail;
});

await step('Admin password reset updates creator credentials', async () => {
  await request(`http://127.0.0.1:3011/api/admin/users/${creatorId}/reset-password`, {
    method: 'POST',
    token: adminToken,
    body: { newPassword: adminResetPassword },
    expected: [200]
  });
  return 'Admin reset-password returned 200';
});

await step('Creator login succeeds after admin reset', async () => {
  await request('http://127.0.0.1:3011/api/auth/login', {
    method: 'POST',
    body: { email: creatorEmail, password: adminResetPassword },
    expected: [200]
  });
  return 'Creator logged in with admin-set password';
});

await step('Creator forgot-password returns stub token', async () => {
  const res = await request('http://127.0.0.1:3011/api/auth/forgot-password', {
    method: 'POST',
    body: { email: creatorEmail },
    expected: [200]
  });
  if (!res.data.resetToken) {
    throw new Error('Stub reset token missing');
  }
  globalThis.creatorResetToken = res.data.resetToken;
  return 'Stub reset token returned';
});

await step('Creator reset-password accepts the stub token', async () => {
  await request('http://127.0.0.1:3011/api/auth/reset-password', {
    method: 'POST',
    body: { token: globalThis.creatorResetToken, newPassword: forgotResetPassword },
    expected: [200]
  });
  return 'Creator password reset completed';
});

await step('Creator login succeeds after forgot/reset flow', async () => {
  await request('http://127.0.0.1:3011/api/auth/login', {
    method: 'POST',
    body: { email: creatorEmail, password: forgotResetPassword },
    expected: [200]
  });
  return 'Creator logged in with forgot/reset password';
});

const summary = {
  phase: 'phase2',
  passed: results.filter((r) => r.status === 'PASS').length,
  failed: results.filter((r) => r.status === 'FAIL').length,
  results
};
fs.writeFileSync(path.join(repoRoot, '.run-logs/auth-smoke-phase2.json'), JSON.stringify(summary, null, 2));

if (summary.failed > 0) process.exit(1);
