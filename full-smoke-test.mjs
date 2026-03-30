import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const repoRoot = path.resolve('.');
const require = createRequire(import.meta.url);
const jwt = require(path.join(repoRoot, 'backend/node_modules/jsonwebtoken'));

const results = [];
const startedAt = new Date().toISOString();
const baseApi = 'http://127.0.0.1:3011';
const authHosts = ['127.0.0.1', 'localhost'];

function readEnvFile(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = readEnvFile(path.join(repoRoot, '.env'));

function makeToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' });
}

function log(status, name, detail, evidence = {}) {
  results.push({ status, name, detail, evidence, timestamp: new Date().toISOString() });
  const marker = status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${name} - ${detail}`);
}

async function request(url, options = {}) {
  const { token, body, headers = {}, expected = [] } = options;
  const response = await fetch(url, {
    method: options.method || (body ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (expected.length && !expected.includes(response.status)) {
    const error = new Error(`Expected ${expected.join('/')} but got ${response.status}`);
    error.response = { status: response.status, data };
    throw error;
  }

  return { status: response.status, data, headers: Object.fromEntries(response.headers.entries()) };
}

async function authRequest(pathname, body, expected, method = 'POST') {
  let lastError = null;
  for (const host of authHosts) {
    try {
      const res = await request(`http://${host}:3011${pathname}`, { method, body, expected });
      return { ...res, host };
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error(`Auth request failed for ${pathname}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runStep(name, fn) {
  try {
    const detail = await fn();
    log('PASS', name, detail.detail || detail || 'ok', detail.evidence || {});
    return detail;
  } catch (error) {
    log(
      'FAIL',
      name,
      error.message,
      error.response ? { status: error.response.status, data: error.response.data } : {}
    );
    throw error;
  }
}

function sanitizeResult(result) {
  return {
    status: result.status,
    name: result.name,
    detail: result.detail,
    evidence: result.evidence,
    timestamp: result.timestamp
  };
}

process.chdir(path.join(repoRoot, 'backend'));
const dbModuleUrl = pathToFileURL(path.join(repoRoot, 'backend/src/db.js')).href;
const { initializeDB, getDB } = await import(dbModuleUrl);
await initializeDB();
const db = getDB();

const seededAdmin = db.prepare(
  'SELECT id, email FROM admins WHERE role = "ADMIN" AND is_active = 1 ORDER BY created_at ASC LIMIT 1'
).get();
const seededCreator = db.prepare(`
  SELECT cr.id, cr.name, cr.profile_slug, ca.email
  FROM creators cr
  JOIN creator_accounts ca ON ca.creator_id = cr.id
  WHERE cr.role = 'CREATOR' AND cr.is_active = 1
  ORDER BY cr.created_at ASC
  LIMIT 1
`).get();
const seededBusiness = db.prepare(`
  SELECT cr.id, cr.name, cr.profile_slug, ca.email
  FROM creators cr
  JOIN creator_accounts ca ON ca.creator_id = cr.id
  WHERE cr.role = 'BUSINESS' AND cr.is_active = 1
  ORDER BY cr.created_at ASC
  LIMIT 1
`).get();

const adminToken = makeToken({ id: seededAdmin.id, email: seededAdmin.email, role: 'ADMIN' });
const seededCreatorToken = makeToken({ id: seededCreator.id, email: seededCreator.email, role: 'CREATOR' });
const seededBusinessToken = makeToken({ id: seededBusiness.id, email: seededBusiness.email, role: 'BUSINESS' });

const unique = Date.now();
const creatorUser = {
  email: `smoke_creator_${unique}@plxyground.local`,
  password: 'SmokePass123!',
  newPassword: 'SmokePass456!',
  name: `Smoke Creator ${unique}`
};
const businessUser = {
  email: `smoke_business_${unique}@plxyground.local`,
  password: 'SmokeBiz123!',
  newPassword: 'SmokeBiz456!',
  name: `Smoke Business ${unique}`
};

const context = {
  reportStartedAt: startedAt,
  seededAdmin,
  seededCreator,
  seededBusiness
};

await runStep('Backend health endpoint', async () => {
  const res = await request(`${baseApi}/healthz`, { expected: [200] });
  assert(res.data.status === 'ok', 'Health response did not include status=ok');
  return { detail: 'GET /healthz returned 200 with status=ok', evidence: res.data };
});

await runStep('Backend root metadata endpoint', async () => {
  const res = await request(`${baseApi}/`, { expected: [200] });
  assert(res.data.web?.app === '/app', 'Root metadata missing app path');
  assert(res.data.web?.admin_panel === '/admin', 'Root metadata missing admin path');
  return { detail: 'GET / returned API metadata and UI mount points', evidence: res.data };
});

await runStep('Frontend dev server responds', async () => {
  const res = await request('http://127.0.0.1:19006/', { expected: [200] });
  assert(typeof res.data === 'string' && res.data.includes('<div id="root">'), 'Frontend HTML missing root div');
  return { detail: 'Frontend dev server returned HTML shell on port 19006' };
});

await runStep('Admin dev server responds', async () => {
  const res = await request('http://127.0.0.1:3012/', { expected: [200] });
  assert(typeof res.data === 'string' && res.data.includes('<div id="root">'), 'Admin HTML missing root div');
  return { detail: 'Admin dev server returned HTML shell on port 3012' };
});

await runStep('Backend-served /app fallback responds', async () => {
  const res = await request(`${baseApi}/app/`, { expected: [200] });
  assert(typeof res.data === 'string' && res.data.includes('<div id="root">'), 'Fallback app HTML missing root div');
  return { detail: 'Backend served the built frontend at /app/' };
});

await runStep('Backend-served /admin fallback responds', async () => {
  const res = await request(`${baseApi}/admin/`, { expected: [200] });
  assert(typeof res.data === 'string' && res.data.includes('<div id="root">'), 'Fallback admin HTML missing root div');
  return { detail: 'Backend served the built admin UI at /admin/' };
});

await runStep('Creator discovery list', async () => {
  const res = await request(`${baseApi}/api/creators?limit=10`, { expected: [200] });
  assert(Array.isArray(res.data.data) && res.data.data.length > 0, 'Creators list was empty');
  return { detail: `Creators list returned ${res.data.data.length} records`, evidence: { total: res.data.pagination.total } };
});

await runStep('Creator detail by slug', async () => {
  const res = await request(`${baseApi}/api/creators/slug/${seededCreator.profile_slug}`, { expected: [200] });
  assert(res.data.id === seededCreator.id, 'Slug route returned the wrong creator');
  assert(Array.isArray(res.data.content), 'Creator detail did not include content array');
  return { detail: `Slug lookup resolved ${res.data.name}`, evidence: { id: res.data.id, contentCount: res.data.content.length } };
});

await runStep('Creator detail by id', async () => {
  const res = await request(`${baseApi}/api/creators/${seededCreator.id}`, { expected: [200] });
  assert(res.data.profile_slug === seededCreator.profile_slug, 'Creator detail by id returned wrong slug');
  return { detail: `ID lookup resolved ${res.data.name}`, evidence: { id: res.data.id, contentCount: res.data.content.length } };
});

await runStep('Opportunities listing', async () => {
  const res = await request(`${baseApi}/api/opportunities?limit=10`, { expected: [200] });
  assert(Array.isArray(res.data.data), 'Opportunities payload missing data array');
  return { detail: `Opportunities endpoint returned ${res.data.data.length} records`, evidence: { total: res.data.pagination.total } };
});

const adminLogin = await runStep('Admin login endpoint', async () => {
  const res = await authRequest('/api/admin/auth/login', {
    email: 'admin@plxyground.local',
    password: 'Internet2026@'
  }, [200]);
  assert(res.data.token, 'Admin login did not return a token');
  return { detail: `Admin login succeeded via ${res.host}`, evidence: { email: res.data.user.email } };
});

const creatorSignup = await runStep('Creator signup endpoint', async () => {
  const res = await authRequest('/api/auth/signup', creatorUser, [201]);
  assert(res.data.token, 'Creator signup did not return token');
  context.creatorId = res.data.user.id;
  context.creatorToken = res.data.token;
  return { detail: `Creator signup created ${creatorUser.email} via ${res.host}`, evidence: { id: res.data.user.id } };
});

await runStep('Creator login endpoint', async () => {
  const res = await authRequest('/api/auth/login', {
    email: creatorUser.email,
    password: creatorUser.password
  }, [200]);
  assert(res.data.user.email === creatorUser.email, 'Creator login returned wrong user');
  return { detail: `Creator login succeeded via ${res.host}`, evidence: { id: res.data.user.id } };
});

const businessSignup = await runStep('Business signup endpoint', async () => {
  const res = await authRequest('/api/business/auth/signup', businessUser, [201]);
  assert(res.data.token, 'Business signup did not return token');
  context.businessId = res.data.user.id;
  context.businessToken = res.data.token;
  return { detail: `Business signup created ${businessUser.email} via ${res.host}`, evidence: { id: res.data.user.id } };
});

await runStep('Business login endpoint', async () => {
  const res = await authRequest('/api/business/auth/login', {
    email: businessUser.email,
    password: businessUser.password
  }, [200]);
  assert(res.data.user.email === businessUser.email, 'Business login returned wrong user');
  return { detail: `Business login succeeded via ${res.host}`, evidence: { id: res.data.user.id } };
});

await runStep('Creator profile update', async () => {
  const payload = {
    bio: 'Smoke test bio',
    location: 'London',
    profile_image_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
    social_links: {
      instagram: 'https://instagram.com/smokecreator',
      website: 'https://example.com/smokecreator'
    }
  };
  const res = await request(`${baseApi}/api/creators/${context.creatorId}`, {
    method: 'PUT',
    token: context.creatorToken,
    body: payload,
    expected: [200]
  });
  const creator = await request(`${baseApi}/api/creators/${context.creatorId}`, { expected: [200] });
  assert(creator.data.bio === payload.bio, 'Profile bio was not updated');
  assert(creator.data.location === payload.location, 'Profile location was not updated');
  return { detail: 'Creator profile update persisted bio, location, image, and social links', evidence: payload };
});

const draftContent = await runStep('Creator draft content creation', async () => {
  const payload = {
    content_type: 'article',
    title: `Smoke Draft ${unique}`,
    body: 'Draft content body for moderation coverage.',
    media_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    is_published: false
  };
  const res = await request(`${baseApi}/api/content`, {
    method: 'POST',
    token: context.creatorToken,
    body: payload,
    expected: [201]
  });
  context.draftContentId = res.data.id;
  return { detail: 'Draft content was created and queued for moderation', evidence: { id: res.data.id } };
});

await runStep('Draft content is hidden from the public feed', async () => {
  const res = await request(`${baseApi}/api/content/${context.draftContentId}`, { expected: [403] });
  return { detail: 'Unauthenticated request to draft content was correctly rejected', evidence: res.data };
});

await runStep('Draft content is accessible to the owner', async () => {
  const res = await request(`${baseApi}/api/content/${context.draftContentId}`, {
    headers: { authorization: `Bearer ${context.creatorToken}` },
    expected: [200]
  });
  assert(res.data.id === context.draftContentId, 'Owner could not retrieve own draft');
  return { detail: 'Owner could retrieve unpublished draft content', evidence: { id: res.data.id } };
});

const queueCheck = await runStep('Admin moderation queue lists the draft', async () => {
  const res = await request(`${baseApi}/api/admin/queue?limit=100`, {
    token: adminToken,
    expected: [200]
  });
  const queueItem = res.data.data.find((item) => item.entity_id === context.draftContentId);
  assert(queueItem, 'Draft content did not appear in moderation queue');
  context.queueItemId = queueItem.id;
  return { detail: 'Moderation queue exposed the new draft content', evidence: queueItem };
});

await runStep('Admin can assign moderation queue items', async () => {
  const res = await request(`${baseApi}/api/admin/queue/bulk-action`, {
    method: 'POST',
    token: adminToken,
    body: { ids: [context.queueItemId], action: 'assign', assigned_admin: seededAdmin.email },
    expected: [200]
  });
  assert(res.data.updatedCount === 1, 'Assign action did not update exactly one row');
  return { detail: 'Bulk assign action succeeded for the queue item', evidence: res.data };
});

await runStep('Admin can approve queued content', async () => {
  const res = await request(`${baseApi}/api/admin/queue/bulk-action`, {
    method: 'POST',
    token: adminToken,
    body: { ids: [context.queueItemId], action: 'approve', reason: 'Smoke approval' },
    expected: [200]
  });
  const content = await request(`${baseApi}/api/content/${context.draftContentId}`, { expected: [200] });
  assert(content.data.id === context.draftContentId, 'Approved content was not retrievable');
  return { detail: 'Bulk approve action published the queued content', evidence: res.data };
});

await runStep('Approved content is searchable in the public feed', async () => {
  const res = await request(`${baseApi}/api/content?search=${encodeURIComponent(`Smoke Draft ${unique}`)}`, { expected: [200] });
  const found = res.data.data.find((item) => item.id === context.draftContentId);
  assert(found, 'Approved content did not appear in search results');
  return { detail: 'Approved content appeared in public feed search results', evidence: { matches: res.data.data.length } };
});

const directPublish = await runStep('Creator can create immediately published content', async () => {
  const payload = {
    content_type: 'article',
    title: `Smoke Publish ${unique}`,
    body: 'Published content body before update.',
    media_url: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0',
    is_published: true
  };
  const res = await request(`${baseApi}/api/content`, {
    method: 'POST',
    token: context.creatorToken,
    body: payload,
    expected: [201]
  });
  context.publishedContentId = res.data.id;
  return { detail: 'Creator created a directly published post', evidence: { id: res.data.id } };
});

await runStep('Creator can update own published content', async () => {
  const payload = {
    content_type: 'video_embed',
    title: `Smoke Publish Updated ${unique}`,
    body: 'Updated published content body.',
    media_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
    is_published: true
  };
  const res = await request(`${baseApi}/api/content/${context.publishedContentId}`, {
    method: 'PUT',
    token: context.creatorToken,
    body: payload,
    expected: [200]
  });
  const feed = await request(`${baseApi}/api/content?search=${encodeURIComponent(payload.title)}`, { expected: [200] });
  assert(feed.data.data.some((item) => item.id === context.publishedContentId), 'Updated content did not appear with the new title');
  return { detail: 'Creator updated title, type, and body of a published post', evidence: res.data };
});

await runStep('Admin content listing includes smoke content', async () => {
  const res = await request(`${baseApi}/api/admin/content?limit=100`, {
    token: adminToken,
    expected: [200]
  });
  const found = res.data.data.find((item) => item.id === context.publishedContentId);
  assert(found, 'Admin content listing did not include the smoke post');
  return { detail: 'Admin content listing exposed the smoke post', evidence: { total: res.data.pagination.total } };
});

await runStep('Admin can edit content metadata', async () => {
  const payload = {
    title: `Admin Edited ${unique}`,
    body: 'Admin-edited body for smoke verification.',
    media_url: 'https://images.unsplash.com/photo-1483721310020-03333e577078',
    content_type: 'image_story',
    is_published: true
  };
  const res = await request(`${baseApi}/api/admin/content/${context.publishedContentId}`, {
    method: 'PUT',
    token: adminToken,
    body: payload,
    expected: [200]
  });
  const listing = await request(`${baseApi}/api/admin/content?limit=100`, {
    token: adminToken,
    expected: [200]
  });
  const content = listing.data.data.find((item) => item.id === context.publishedContentId);
  assert(content && content.title === payload.title, 'Admin edit did not persist title');
  return { detail: 'Admin content edit endpoint persisted changes', evidence: res.data };
});

await runStep('Direct messaging conversation creation', async () => {
  const res = await request(`${baseApi}/api/messages/conversations`, {
    method: 'POST',
    token: context.creatorToken,
    body: { peerUserId: context.businessId },
    expected: [201, 200]
  });
  context.conversationId = res.data.data.id;
  return { detail: 'Conversation endpoint created or reused a 1:1 thread', evidence: { id: context.conversationId } };
});

await runStep('Direct messaging send and fetch', async () => {
  const send = await request(`${baseApi}/api/messages/conversations/${context.conversationId}/messages`, {
    method: 'POST',
    token: context.creatorToken,
    body: { body: 'Smoke test message body' },
    expected: [201]
  });
  const fetchMessages = await request(`${baseApi}/api/messages/conversations/${context.conversationId}/messages?limit=20`, {
    token: context.businessToken,
    expected: [200]
  });
  const found = fetchMessages.data.data.find((msg) => msg.id === send.data.data.id);
  assert(found, 'Sent message was not visible to the peer participant');
  return { detail: 'Conversation message send and retrieval both worked', evidence: { messageId: send.data.data.id } };
});

await runStep('Conversation list for both participants', async () => {
  const creatorConversations = await request(`${baseApi}/api/messages/conversations?limit=20`, {
    token: context.creatorToken,
    expected: [200]
  });
  const businessConversations = await request(`${baseApi}/api/messages/conversations?limit=20`, {
    token: context.businessToken,
    expected: [200]
  });
  assert(creatorConversations.data.data.some((item) => item.id === context.conversationId), 'Creator missing conversation');
  assert(businessConversations.data.data.some((item) => item.id === context.conversationId), 'Business missing conversation');
  return { detail: 'Conversation lists are populated for both participants' };
});

await runStep('Admin user listing and search', async () => {
  const res = await request(`${baseApi}/api/admin/users?search=${encodeURIComponent(creatorUser.email)}&limit=50`, {
    token: adminToken,
    expected: [200]
  });
  const found = res.data.data.find((item) => item.email === creatorUser.email);
  assert(found, 'Admin user search did not find the smoke creator');
  return { detail: 'Admin users search located the smoke creator account', evidence: { matches: res.data.data.length } };
});

await runStep('Admin can suspend a creator account', async () => {
  const res = await request(`${baseApi}/api/admin/users/${context.creatorId}/suspend`, {
    method: 'POST',
    token: adminToken,
    body: { reason: 'Smoke suspend' },
    expected: [200]
  });
  const users = await request(`${baseApi}/api/admin/users?search=${encodeURIComponent(creatorUser.email)}&limit=50`, {
    token: adminToken,
    expected: [200]
  });
  const account = users.data.data.find((item) => item.email === creatorUser.email);
  assert(account?.is_suspended === 1, 'Creator account was not suspended');
  return { detail: 'Suspend endpoint set is_suspended=1', evidence: res.data };
});

await runStep('Admin can reactivate a creator account', async () => {
  const res = await request(`${baseApi}/api/admin/users/${context.creatorId}/reactivate`, {
    method: 'POST',
    token: adminToken,
    body: {},
    expected: [200]
  });
  const users = await request(`${baseApi}/api/admin/users?search=${encodeURIComponent(creatorUser.email)}&limit=50`, {
    token: adminToken,
    expected: [200]
  });
  const account = users.data.data.find((item) => item.email === creatorUser.email);
  assert(account?.is_suspended === 0, 'Creator account was not reactivated');
  return { detail: 'Reactivate endpoint cleared is_suspended', evidence: res.data };
});

await runStep('Admin can verify a creator account', async () => {
  const res = await request(`${baseApi}/api/admin/users/${context.creatorId}/verify`, {
    method: 'POST',
    token: adminToken,
    body: {},
    expected: [200]
  });
  const users = await request(`${baseApi}/api/admin/users?search=${encodeURIComponent(creatorUser.email)}&limit=50`, {
    token: adminToken,
    expected: [200]
  });
  const account = users.data.data.find((item) => item.email === creatorUser.email);
  assert(account?.is_approved === 1, 'Creator account was not marked approved');
  return { detail: 'Verify endpoint marked the account as approved', evidence: res.data };
});

await runStep('Admin can reset a creator password', async () => {
  const res = await request(`${baseApi}/api/admin/users/${context.creatorId}/reset-password`, {
    method: 'POST',
    token: adminToken,
    body: { newPassword: creatorUser.newPassword },
    expected: [200]
  });
  return { detail: 'Admin reset-password endpoint succeeded', evidence: res.data };
});

await runStep('Audit log listing', async () => {
  const res = await request(`${baseApi}/api/admin/audit?limit=50`, {
    token: adminToken,
    expected: [200]
  });
  assert(Array.isArray(res.data.data) && res.data.data.length > 0, 'Audit log listing was empty');
  const containsSmoke = res.data.data.some((entry) => String(entry.actor || '').includes('smoke_') || String(entry.target || '').includes(context.creatorId));
  assert(containsSmoke, 'Audit log did not contain smoke-test activity');
  return { detail: `Audit log returned ${res.data.data.length} entries`, evidence: { total: res.data.pagination.total } };
});

await runStep('Audit CSV export', async () => {
  const res = await request(`${baseApi}/api/admin/audit/export`, {
    token: adminToken,
    headers: { accept: 'text/csv' },
    expected: [200]
  });
  assert(typeof res.data === 'string' && res.data.includes('ID,Action,Actor,Target,Reason,Created At'), 'Audit export CSV header missing');
  return { detail: 'Audit export endpoint returned CSV content' };
});

await runStep('Admin analytics endpoint', async () => {
  const res = await request(`${baseApi}/api/admin/analytics`, {
    token: adminToken,
    expected: [200]
  });
  assert(typeof res.data.kpis?.totalCreators === 'number', 'Analytics KPI payload missing totalCreators');
  return { detail: 'Analytics endpoint returned KPI metrics', evidence: res.data.kpis };
});

await runStep('Admin live alerts endpoint', async () => {
  const res = await request(`${baseApi}/api/admin/alerts`, {
    token: adminToken,
    expected: [200]
  });
  assert(Array.isArray(res.data.data), 'Alerts payload missing data array');
  const smokeAlert = res.data.data.find((item) =>
    String(item.title_or_name || '').includes(`Smoke`) ||
    String(item.email || '').includes(`smoke_`)
  );
  assert(smokeAlert, 'Alerts did not include recent smoke-test activity');
  return { detail: 'Live alerts captured recent user or content activity', evidence: { count: res.data.data.length } };
});

await runStep('Creator can delete own published content', async () => {
  const res = await request(`${baseApi}/api/content/${context.publishedContentId}`, {
    method: 'DELETE',
    token: context.creatorToken,
    expected: [200]
  });
  const listing = await request(`${baseApi}/api/admin/content?limit=100`, {
    token: adminToken,
    expected: [200]
  });
  assert(!listing.data.data.some((item) => item.id === context.publishedContentId), 'Deleted content still exists in admin listing');
  return { detail: 'Creator delete endpoint removed a published post', evidence: res.data };
});

await runStep('Admin can delete approved content', async () => {
  const res = await request(`${baseApi}/api/admin/content/${context.draftContentId}`, {
    method: 'DELETE',
    token: adminToken,
    expected: [200]
  });
  const listing = await request(`${baseApi}/api/admin/content?limit=100`, {
    token: adminToken,
    expected: [200]
  });
  assert(!listing.data.data.some((item) => item.id === context.draftContentId), 'Admin-deleted content still exists in admin listing');
  return { detail: 'Admin delete endpoint removed approved content', evidence: res.data };
});

const summary = {
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter((r) => r.status === 'PASS').length,
  failed: results.filter((r) => r.status === 'FAIL').length,
  results: results.map(sanitizeResult)
};

fs.mkdirSync(path.join(repoRoot, '.run-logs'), { recursive: true });
fs.writeFileSync(
  path.join(repoRoot, '.run-logs/full-smoke-test-results.json'),
  JSON.stringify(summary, null, 2),
  'utf8'
);

console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed`);

if (summary.failed > 0) {
  process.exit(1);
}
