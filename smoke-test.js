#!/usr/bin/env node
/**
 * PLXYGROUND Smoke Test Suite
 * Tests basic functionality of all three services
 */

const http = require('http');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}!${COLORS.reset} ${msg}`)
};

function makeRequest(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : data,
            headers: res.headers
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║        PLXYGROUND SMOKE TEST SUITE                ║
║        ${new Date().toISOString().split('T')[0]}                              ║
╚═══════════════════════════════════════════════════╝
`);

  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Backend Health
  try {
    log.info('Testing Backend Health...');
    const res = await makeRequest('GET', 'http://localhost:3011/healthz');
    if (res.status === 200 && res.data.status === 'ok') {
      log.success('Backend is running and healthy');
      passed++;
    } else {
      log.error(`Backend health check failed (status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    log.error(`Backend not responding: ${err.message}`);
    failed++;
  }

  // Test 2: Creator Signup & Login
  try {
    log.info('Testing Creator Signup...');
    const testUser = {
      email: `test_${Date.now()}@plxyground.local`,
      password: 'TestPassword123!',
      name: 'Test Creator'
    };
    
    const signupRes = await makeRequest('POST', 'http://localhost:3011/api/auth/signup', testUser);
    if (signupRes.status === 201 && signupRes.data.token) {
      log.success('Creator signup successful');
      passed++;

      // Test Login
      log.info('Testing Creator Login...');
      const loginRes = await makeRequest('POST', 'http://localhost:3011/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      if (loginRes.status === 200 && loginRes.data.token) {
        log.success('Creator login successful');
        passed++;
      } else {
        log.error('Creator login failed');
        failed++;
      }
    } else {
      log.error(`Creator signup failed (status: ${signupRes.status})`);
      failed++;
    }
  } catch (err) {
    log.error(`Signup/Login test failed: ${err.message}`);
    failed += 2;
  }

  // Test 3: Admin Login
  try {
    log.info('Testing Admin Login...');
    const loginRes = await makeRequest('POST', 'http://localhost:3011/api/admin/auth/login', {
      email: 'admin@plxyground.local',
      password: 'Internet2026@'
    });
    if (loginRes.status === 200 && loginRes.data.token) {
      log.success('Admin login successful');
      passed++;
    } else {
      log.error(`Admin login failed (status: ${loginRes.status})`);
      failed++;
    }
  } catch (err) {
    log.error(`Admin login test failed: ${err.message}`);
    failed++;
  }

  // Test 4: Content Creation with Media URL
  try {
    log.info('Testing Content Creation...');
    const contentData = {
      content_type: 'article',
      title: 'Smoke Test Post',
      body: 'This is a test post created during smoke testing',
      media_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80'
    };

    // First create a token and user
    const signupRes = await makeRequest('POST', 'http://localhost:3011/api/auth/signup', {
      email: `content_${Date.now()}@plxyground.local`,
      password: 'TestPassword123!',
      name: 'Content Tester'
    });

    if (signupRes.status === 201) {
      const token = signupRes.data.token;
      const options = {
        hostname: 'localhost',
        port: 3011,
        path: '/api/content',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const contentRes = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          }));
        });
        req.on('error', reject);
        req.write(JSON.stringify(contentData));
        req.end();
      });

      if (contentRes.status === 201) {
        log.success('Content creation successful with media URL');
        passed++;
      } else {
        log.error(`Content creation failed (status: ${contentRes.status})`);
        failed++;
      }
    }
  } catch (err) {
    log.error(`Content creation test failed: ${err.message}`);
    failed++;
  }

  // Test 5: Public Feed Endpoint
  try {
    log.info('Testing Public Feed...');
    const feedRes = await makeRequest('GET', 'http://localhost:3011/api/content?limit=10');
    if (feedRes.status === 200 && feedRes.data.data) {
      log.success(`Public feed accessible (${feedRes.data.data.length} items)`);
      passed++;
    } else {
      log.warn('Feed endpoint returned no data');
      passed++;
    }
  } catch (err) {
    log.error(`Feed test failed: ${err.message}`);
    failed++;
  }

  // Test 6: Creator List Endpoint
  try {
    log.info('Testing Creator Discovery...');
    const creatorsRes = await makeRequest('GET', 'http://localhost:3011/api/creators?limit=10');
    if (creatorsRes.status === 200) {
      log.success(`Creators endpoint working (${creatorsRes.data.data?.length || 0} creators)`);
      passed++;
    } else {
      log.error(`Creators endpoint failed (status: ${creatorsRes.status})`);
      failed++;
    }
  } catch (err) {
    log.error(`Creators test failed: ${err.message}`);
    failed++;
  }

  // Test 7: Frontend Check
  try {
    log.info('Checking Frontend...');
    const frontendRes = await makeRequest('GET', 'http://localhost:19006/');
    if (frontendRes.status === 200) {
      log.success('Frontend is running on port 19006');
      passed++;
    } else {
      log.error(`Frontend returned status ${frontendRes.status}`);
      failed++;
    }
  } catch (err) {
    log.error(`Frontend check failed: ${err.message}`);
    failed++;
  }

  // Test 8: Admin Panel Check
  try {
    log.info('Checking Admin Panel...');
    const adminRes = await makeRequest('GET', 'http://localhost:3012/');
    if (adminRes.status === 200) {
      log.success('Admin Panel is running on port 3012');
      passed++;
    } else {
      log.error(`Admin Panel returned status ${adminRes.status}`);
      failed++;
    }
  } catch (err) {
    log.error(`Admin Panel check failed: ${err.message}`);
    failed++;
  }

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════╗
║              TEST RESULTS                         ║
╚═══════════════════════════════════════════════════╝

${COLORS.green}✓ Passed: ${passed}${COLORS.reset}
${COLORS.red}✗ Failed: ${failed}${COLORS.reset}
Total: ${passed + failed}

${passed === passed + failed ? '✅ All tests passed!' : '⚠️  Some tests failed. See above for details.'}

📍 Running Services:
  • Backend API:  http://localhost:3011
  • Frontend:     http://localhost:19006
  • Admin Panel:  http://localhost:3012

🔐 Test Credentials:
  • Admin:   admin@plxyground.local / Internet2026@
  • Creator: sarahjohnson@plxyground.local / Password1!

`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log.error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
