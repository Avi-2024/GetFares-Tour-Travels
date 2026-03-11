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
  const { app, container } = createApp();
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

  function authHeaders(token) {
    return { authorization: `Bearer ${token}` };
  }

  let adminToken;
  let leadAId;
  let leadBId;
  let leadForSlaId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  const seed = randomUUID().slice(0, 8);
  const password = 'StrongPass123';

  const adminEmail = `s2-admin-${seed}@example.com`;
  const c1Email = `s2-consultant1-${seed}@example.com`;
  const c2Email = `s2-consultant2-${seed}@example.com`;

  try {
    const registerAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint2 Admin',
        email: adminEmail,
        phone: '+919999990001',
        password,
        role: 'admin',
      },
    });

    assert.equal(registerAdmin.response.status, 201);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: adminEmail,
        password,
      },
    });

    assert.equal(loginAdmin.response.status, 200);
    assert.ok(loginAdmin.json?.data?.accessToken);

    adminToken = loginAdmin.json.data.accessToken;
    addResult('Auth admin setup', true, 'Admin register/login success');
  } catch (error) {
    addResult('Auth admin setup', false, error.message);
  }

  try {
    const registerConsultant1 = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Consultant One',
        email: c1Email,
        phone: '+919999990002',
        password,
        role: 'sales_consultant',
      },
    });

    const registerConsultant2 = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Consultant Two',
        email: c2Email,
        phone: '+919999990003',
        password,
        role: 'sales_consultant',
      },
    });

    assert.equal(registerConsultant1.response.status, 201);
    assert.equal(registerConsultant2.response.status, 201);

    addResult('Consultant pool setup', true, '2 consultants created');
  } catch (error) {
    addResult('Consultant pool setup', false, error.message);
  }

  try {
    const leadA = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint2 Lead A',
        phone: `9198${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s2-lead-a-${seed}@example.com`,
        source: 'Website',
        budget: 110000,
        status: 'OPEN',
        autoAssign: false,
      },
    });

    const leadB = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint2 Lead B',
        phone: `9197${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s2-lead-b-${seed}@example.com`,
        source: 'Meta',
        budget: 180000,
        status: 'OPEN',
        autoAssign: false,
      },
    });

    assert.equal(leadA.response.status, 201);
    assert.equal(leadB.response.status, 201);

    leadAId = leadA.json?.data?.id;
    leadBId = leadB.json?.data?.id;

    assert.ok(leadAId);
    assert.ok(leadBId);

    addResult('Lead create (unassigned)', true, '2 leads created with autoAssign=false');
  } catch (error) {
    addResult('Lead create (unassigned)', false, error.message);
  }

  try {
    const distribute = await request('/api/leads/distribute', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        limit: 500,
        reason: 'Sprint2 distribution test',
      },
    });

    assert.equal(distribute.response.status, 200);
    assert.ok(distribute.json?.data);
    assert.ok(Number(distribute.json.data.processed) >= 1);

    addResult(
      'Lead distribute',
      true,
      `Processed=${distribute.json.data.processed}, Assigned=${distribute.json.data.assigned}`,
    );
  } catch (error) {
    addResult('Lead distribute', false, error.message);
  }

  let assignedLead;
  try {
    const leadAAfter = await request(`/api/leads/${leadAId}`, {
      headers: authHeaders(adminToken),
    });

    assert.equal(leadAAfter.response.status, 200);

    if (!leadAAfter.json?.data?.assignedTo) {
      const manualAssign = await request(`/api/leads/${leadAId}/assign`, {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: {
          force: true,
          reason: 'Sprint2 deterministic assignment check',
          mode: 'MANUAL',
        },
      });

      assert.equal(manualAssign.response.status, 200);
      assert.ok(manualAssign.json?.data?.assignedTo);
      assignedLead = manualAssign.json.data;
    } else {
      assignedLead = leadAAfter.json.data;
    }

    addResult('Lead assignment check', true, `Lead assigned to ${assignedLead.assignedTo}`);
  } catch (error) {
    addResult('Lead assignment check', false, error.message);
  }

  try {
    const overdueDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const createFollowup = await request(`/api/leads/${leadAId}/followups`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        followupType: 'CALL',
        followupDate: overdueDate,
        notes: 'Sprint2 overdue followup',
      },
    });

    assert.equal(createFollowup.response.status, 201);
    assert.ok(createFollowup.json?.data?.id);

    addResult('Create followup', true, 'Overdue followup created');
  } catch (error) {
    addResult('Create followup', false, error.message);
  }

  try {
    const listOverdue = await request('/api/leads/followups/overdue?limit=50', {
      headers: authHeaders(adminToken),
    });

    assert.equal(listOverdue.response.status, 200);
    assert.ok(Array.isArray(listOverdue.json?.data));
    assert.ok(listOverdue.json.data.length >= 1);

    addResult('List overdue followups', true, `Overdue count=${listOverdue.json.data.length}`);
  } catch (error) {
    addResult('List overdue followups', false, error.message);
  }

  try {
    const processOverdue = await request('/api/leads/followups/process-overdue', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: { limit: 50 },
    });

    assert.equal(processOverdue.response.status, 200);
    assert.ok(Number(processOverdue.json?.data?.processed) >= 1);

    addResult('Process overdue followups', true, `Processed=${processOverdue.json.data.processed}`);
  } catch (error) {
    addResult('Process overdue followups', false, error.message);
  }

  try {
    const oldAssignedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    await container.db.update('leads', leadAId, {
      assigned_at: oldAssignedAt,
      response_at: null,
      status: 'OPEN',
    });

    const reassignInactive = await request('/api/leads/reassign-inactive', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        inactiveMinutes: 15,
        limit: 20,
        reason: 'Sprint2 inactivity test',
      },
    });

    assert.equal(reassignInactive.response.status, 200);
    assert.ok(Number(reassignInactive.json?.data?.processed) >= 1);

    addResult(
      'Reassign inactive',
      true,
      `Processed=${reassignInactive.json.data.processed}, Reassigned=${reassignInactive.json.data.reassigned}`,
    );
  } catch (error) {
    addResult('Reassign inactive', false, error.message);
  }

  try {
    const leadForSla = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint2 Lead SLA',
        phone: `9196${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s2-lead-sla-${seed}@example.com`,
        source: 'Website',
        budget: 90000,
        status: 'OPEN',
        autoAssign: false,
      },
    });

    assert.equal(leadForSla.response.status, 201);
    leadForSlaId = leadForSla.json?.data?.id;
    assert.ok(leadForSlaId);

    const pastDeadline = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await container.db.update('leads', leadForSlaId, {
      response_deadline: pastDeadline,
      response_at: null,
      sla_breached: false,
      status: 'OPEN',
    });

    const processSla = await request('/api/leads/sla/process-breaches', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: { limit: 50 },
    });

    assert.equal(processSla.response.status, 200);
    assert.ok(Number(processSla.json?.data?.processed) >= 1);

    addResult('Process SLA breaches', true, `Processed=${processSla.json.data.processed}`);
  } catch (error) {
    addResult('Process SLA breaches', false, error.message);
  }

  try {
    const leadSlaAfter = await request(`/api/leads/${leadForSlaId}`, {
      headers: authHeaders(adminToken),
    });

    assert.equal(leadSlaAfter.response.status, 200);
    assert.equal(Boolean(leadSlaAfter.json?.data?.slaBreached), true);

    addResult('SLA breach persisted', true, 'Lead has slaBreached=true');
  } catch (error) {
    addResult('SLA breach persisted', false, error.message);
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

  console.log('\nSprint 2 Smoke Test Results');
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
  console.error('Sprint 2 smoke test execution failed:', error.message);
  process.exitCode = 1;
});

