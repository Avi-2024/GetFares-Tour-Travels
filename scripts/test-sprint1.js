const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { createApp } = require('../src/app');

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

async function main() {
  const { app } = createApp();
  const server = app.listen(0);

  const results = [];

  function addResult(name, passed, details) {
    results.push({ name, passed, details });
  }

  const baseUrl = await new Promise((resolve, reject) => {
    server.once('listening', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
    server.once('error', reject);
  });

  async function request(path, { method = 'GET', headers = {}, body } = {}) {
    const init = {
      method,
      headers: {
        ...headers,
      },
    };

    if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, init);
    const json = await parseJson(response);
    return { response, json };
  }

  let token;
  let firstLeadId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  const seed = randomUUID().slice(0, 8);
  const email = `sprint1-${seed}@example.com`;
  const leadEmail = `lead-${seed}@example.com`;
  const leadPhone = `9198${Math.floor(100000 + Math.random() * 900000)}`;
  const password = 'StrongPass123';

  try {
    const register = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint One Tester',
        email,
        phone: '+919999999999',
        password,
        role: 'sales_consultant',
      },
    });

    assert.equal(register.response.status, 201);
    assert.ok(register.json?.data?.accessToken);
    addResult('Auth register', true, 'POST /api/auth/register returned 201 with token');
  } catch (error) {
    addResult('Auth register', false, error.message);
  }

  try {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
      },
    });

    assert.equal(login.response.status, 200);
    assert.ok(login.json?.data?.accessToken);
    token = login.json.data.accessToken;
    addResult('Auth login', true, 'POST /api/auth/login returned 200 with token');
  } catch (error) {
    addResult('Auth login', false, error.message);
  }

  try {
    const createLead = await request('/api/leads', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        fullName: 'Test Lead Sprint1',
        phone: leadPhone,
        email: leadEmail,
        source: 'Website',
        budget: 125000,
        status: 'OPEN',
        utmSource: 'website',
        utmMedium: 'organic',
        utmCampaign: 'spring_test',
      },
    });

    assert.equal(createLead.response.status, 201);
    firstLeadId = createLead.json?.data?.id;
    assert.ok(firstLeadId);
    addResult('Lead create', true, 'POST /api/leads returned 201');
  } catch (error) {
    addResult('Lead create', false, error.message);
  }

  let preDuplicateCount = 0;

  try {
    const listLeads = await request('/api/leads', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(listLeads.response.status, 200);
    assert.ok(Array.isArray(listLeads.json?.data));
    preDuplicateCount = listLeads.json.data.length;
    addResult('Lead list', true, `GET /api/leads returned ${preDuplicateCount} lead(s)`);
  } catch (error) {
    addResult('Lead list', false, error.message);
  }

  if (!firstLeadId) {
    addResult('Lead anti-duplication', false, 'Cannot verify because lead creation failed');
  } else {
    try {
      const duplicateLead = await request('/api/leads', {
        method: 'POST',
        headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        fullName: 'Test Lead Sprint1',
        phone: leadPhone,
        email: leadEmail,
        source: 'Website',
        budget: 125000,
        status: 'OPEN',
      },
    });

      const listAfterDuplicate = await request('/api/leads', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const postDuplicateCount = Array.isArray(listAfterDuplicate.json?.data) ? listAfterDuplicate.json.data.length : -1;

      const duplicatePrevented = duplicateLead.response.status === 409 || postDuplicateCount === preDuplicateCount;

      if (!duplicatePrevented) {
        throw new Error(
          `Duplicate prevention missing. Status=${duplicateLead.response.status}, before=${preDuplicateCount}, after=${postDuplicateCount}`,
        );
      }

      addResult('Lead anti-duplication', true, 'Duplicate lead blocked or merged');
    } catch (error) {
      addResult('Lead anti-duplication', false, error.message);
    }
  }

  const webhookPaths = [
    '/api/webhooks/meta-leads',
    '/api/webhooks/website-enquiry',
    '/api/webhooks/whatsapp-enquiry',
  ];

  for (const path of webhookPaths) {
    try {
      const webhook = await request(path, {
        method: 'POST',
        body: {
          fullName: 'Webhook Lead',
          phone: `9197${Math.floor(100000 + Math.random() * 900000)}`,
          email: `webhook-${seed}-${Math.floor(Math.random() * 10000)}@example.com`,
          utmSource: 'webhook',
          utmCampaign: 'sprint1',
        },
      });

      if (webhook.response.status === 404) {
        throw new Error('Endpoint not implemented (404)');
      }

      if (webhook.response.status >= 400) {
        throw new Error(`Endpoint returned ${webhook.response.status}`);
      }

      addResult(`Webhook ${path}`, true, `POST ${path} returned ${webhook.response.status}`);
    } catch (error) {
      addResult(`Webhook ${path}`, false, error.message);
    }
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  console.log('\nSprint 1 Smoke Test Results');
  console.log('---------------------------');

  for (const item of results) {
    const prefix = item.passed ? 'PASS' : 'FAIL';
    console.log(`${prefix} | ${item.name} | ${item.details}`);
  }

  const failed = results.filter((item) => !item.passed);
  console.log('---------------------------');
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Sprint 1 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
