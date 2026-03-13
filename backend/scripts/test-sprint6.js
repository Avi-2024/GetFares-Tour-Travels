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
      headers: { ...headers },
    };

    if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, init);
    const json = await parseJson(response);
    return { response, json };
  }

  function authHeaders(token) {
    return { authorization: `Bearer ${token}` };
  }

  const seed = randomUUID().slice(0, 8);
  const password = 'StrongPass123';

  let adminToken;
  let createdUserId;
  let createdCampaignId;
  let createdCustomerId;
  let createdComplaintId;
  let createdActivityId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const adminEmail = `s6-admin-${seed}@example.com`;

    const registerAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Sprint6 Admin', email: adminEmail, password, role: 'admin' },
    });
    assert.equal(registerAdmin.response.status, 201);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });
    assert.equal(loginAdmin.response.status, 200);

    adminToken = loginAdmin.json?.data?.accessToken;
    assert.ok(adminToken);

    addResult('Auth setup', true, 'Admin register/login success');
  } catch (error) {
    addResult('Auth setup', false, error.message);
  }

  try {
    const userEmail = `s6-user-${seed}@example.com`;
    const createUser = await request('/api/users', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint6 Ops User',
        email: userEmail,
        phone: '919999000001',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghi',
        isActive: true,
        isOnLeave: false,
        expertiseDestinations: ['UAE', 'Singapore'],
        targetAmount: 500000,
        incentivePercent: 7.5,
      },
    });

    assert.equal(createUser.response.status, 201);
    createdUserId = createUser.json?.data?.id;
    assert.ok(createdUserId);
    assert.equal(createUser.json?.data?.fullName, 'Sprint6 Ops User');
    assert.equal(createUser.json?.data?.email, userEmail);
    assert.equal(createUser.json?.data?.passwordHash, undefined);

    const listUsers = await request('/api/users?isActive=true', {
      headers: authHeaders(adminToken),
    });
    assert.equal(listUsers.response.status, 200);
    assert.ok(Array.isArray(listUsers.json?.data));

    addResult('Users business contract', true, `User created ${createdUserId}`);
  } catch (error) {
    addResult('Users business contract', false, error.message);
  }

  try {
    const createCampaign = await request('/api/campaigns', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        name: 'Summer UAE Blitz',
        source: 'Meta Ads',
        budget: 250000,
        actualSpend: 120000,
        leadsGenerated: 340,
        revenueGenerated: 1800000,
        metaCampaignId: `meta-cmp-${seed}`,
        metaAdsetId: `meta-adset-${seed}`,
        metaAdId: `meta-ad-${seed}`,
        startDate: '2026-04-01',
        endDate: '2026-05-31',
      },
    });

    assert.equal(createCampaign.response.status, 201);
    createdCampaignId = createCampaign.json?.data?.id;
    assert.ok(createdCampaignId);
    assert.equal(createCampaign.json?.data?.source, 'Meta Ads');

    const updateCampaign = await request(`/api/campaigns/${createdCampaignId}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: {
        actualSpend: 145000,
        leadsGenerated: 410,
      },
    });
    assert.equal(updateCampaign.response.status, 200);

    addResult('Campaigns business contract', true, `Campaign created ${createdCampaignId}`);
  } catch (error) {
    addResult('Campaigns business contract', false, error.message);
  }

  try {
    const customerEmail = `s6-customer-${seed}@example.com`;
    const createCustomer = await request('/api/customers', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint6 Customer',
        phone: '918888000222',
        email: customerEmail,
        preferences: 'Family travel, 4-star stays',
        lifetimeValue: 1250000,
        segment: 'GOLD',
        panNumber: 'ABCDE1234F',
        addressLine: 'Dubai Marina, UAE',
        clientCurrency: 'AED',
      },
    });

    assert.equal(createCustomer.response.status, 201);
    createdCustomerId = createCustomer.json?.data?.id;
    assert.ok(createdCustomerId);
    assert.equal(createCustomer.json?.data?.segment, 'GOLD');

    const updateCustomer = await request(`/api/customers/${createdCustomerId}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: {
        segment: 'PLATINUM',
        lifetimeValue: 1500000,
      },
    });
    assert.equal(updateCustomer.response.status, 200);
    assert.equal(updateCustomer.json?.data?.segment, 'PLATINUM');

    addResult('Customers business contract', true, `Customer created ${createdCustomerId}`);
  } catch (error) {
    addResult('Customers business contract', false, error.message);
  }

  try {
    const createComplaint = await request('/api/complaints', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        assignedTo: createdUserId,
        issueType: 'Hotel check-in delay',
        description: 'Customer reported delayed check-in at property.',
        status: 'OPEN',
      },
    });

    assert.equal(createComplaint.response.status, 201);
    createdComplaintId = createComplaint.json?.data?.id;
    assert.ok(createdComplaintId);

    const addActivity = await request(`/api/complaints/${createdComplaintId}/activities`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        note: 'Called hotel and escalated to duty manager.',
      },
    });

    assert.equal(addActivity.response.status, 201);
    createdActivityId = addActivity.json?.data?.id;
    assert.ok(createdActivityId);

    const listActivities = await request(`/api/complaints/${createdComplaintId}/activities`, {
      headers: authHeaders(adminToken),
    });
    assert.equal(listActivities.response.status, 200);
    assert.ok(Array.isArray(listActivities.json?.data));
    assert.ok(listActivities.json.data.some((item) => item.id === createdActivityId));

    addResult('Complaints workflow + activities', true, `Complaint ${createdComplaintId} with activity ${createdActivityId}`);
  } catch (error) {
    addResult('Complaints workflow + activities', false, error.message);
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

  console.log('\nSprint 6 Smoke Test Results');
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
  console.error('Sprint 6 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
