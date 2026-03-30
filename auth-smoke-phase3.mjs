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

const userSearch = await request('http://127.0.0.1:3011/api/admin/users?search=smoke_business_&limit=200', {
  token: adminToken,
  expected: [200]
});
const smokeBusiness = userSearch.data.data.find((item) => item.role === 'BUSINESS') || userSearch.data.data[0];
const businessEmail = smokeBusiness.email;
const businessPassword = 'BusinessForgot123!';

await step('Business forgot-password returns stub token', async () => {
  const res = await request('http://127.0.0.1:3011/api/business/auth/forgot-password', {
    method: 'POST',
    body: { email: businessEmail },
    expected: [200]
  });
  if (!res.data.resetToken) {
    throw new Error('Business reset token missing');
  }
  globalThis.businessResetToken = res.data.resetToken;
  return businessEmail;
});

await step('Business reset-password accepts the stub token', async () => {
  await request('http://127.0.0.1:3011/api/business/auth/reset-password', {
    method: 'POST',
    body: { token: globalThis.businessResetToken, newPassword: businessPassword },
    expected: [200]
  });
  return 'Business password reset completed';
});

await step('Business login succeeds after forgot/reset flow', async () => {
  await request('http://127.0.0.1:3011/api/business/auth/login', {
    method: 'POST',
    body: { email: businessEmail, password: businessPassword },
    expected: [200]
  });
  return 'Business logged in with reset password';
});

await step('Admin forgot-password returns stub token', async () => {
  const res = await request('http://127.0.0.1:3011/api/admin/auth/forgot-password', {
    method: 'POST',
    body: { email: 'admin@plxyground.local' },
    expected: [200]
  });
  if (!res.data.resetToken) {
    throw new Error('Admin reset token missing');
  }
  return 'Admin forgot-password returned a stub token';
});

const summary = {
  phase: 'phase3',
  passed: results.filter((r) => r.status === 'PASS').length,
  failed: results.filter((r) => r.status === 'FAIL').length,
  results
};
fs.writeFileSync(path.join(repoRoot, '.run-logs/auth-smoke-phase3.json'), JSON.stringify(summary, null, 2));

if (summary.failed > 0) process.exit(1);
