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
  let adminUserId;
  let campaignId;
  let leadOneId;
  let quotationId;
  let bookingId;
  let supplierId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const adminEmail = `s7-admin-${seed}@example.com`;

    const register = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Sprint7 Admin', email: adminEmail, password, role: 'admin' },
    });
    assert.equal(register.response.status, 201);

    adminUserId = register.json?.data?.user?.id;
    assert.ok(adminUserId);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });
    assert.equal(login.response.status, 200);

    adminToken = login.json?.data?.accessToken;
    assert.ok(adminToken);

    addResult('Auth setup', true, `Admin ready (${adminUserId})`);
  } catch (error) {
    addResult('Auth setup', false, error.message);
  }

  try {
    const createCampaign = await request('/api/campaigns', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        name: `Sprint7 Campaign ${seed}`,
        source: 'Meta Ads',
        budget: 100000,
        actualSpend: 22000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    });

    assert.equal(createCampaign.response.status, 201);
    campaignId = createCampaign.json?.data?.id;
    assert.ok(campaignId);

    addResult('Campaign setup', true, `Campaign created ${campaignId}`);
  } catch (error) {
    addResult('Campaign setup', false, error.message);
  }

  try {
    const leadOne = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint7 Lead One',
        phone: `9191${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s7-lead1-${seed}@example.com`,
        source: 'Meta Ads',
        campaignId,
        travelDate: '2026-09-10',
        budget: 180000,
      },
    });
    assert.equal(leadOne.response.status, 201);
    leadOneId = leadOne.json?.data?.id;
    assert.ok(leadOneId);

    const leadTwo = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint7 Lead Two',
        phone: `9292${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s7-lead2-${seed}@example.com`,
        source: 'Google Ads',
        campaignId,
        travelDate: '2026-10-15',
        budget: 210000,
      },
    });
    assert.equal(leadTwo.response.status, 201);

    const leadThree = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        fullName: 'Sprint7 Lead Three',
        phone: `9393${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s7-lead3-${seed}@example.com`,
        source: 'Website',
        campaignId,
        travelDate: '2026-11-18',
        budget: 250000,
      },
    });
    assert.equal(leadThree.response.status, 201);

    const markLost = await request(`/api/leads/${leadTwo.json?.data?.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: {
        status: 'LOST',
        closedReason: 'Budget mismatch',
      },
    });
    assert.equal(markLost.response.status, 200);

    const markConverted = await request(`/api/leads/${leadThree.json?.data?.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: {
        status: 'CONVERTED',
      },
    });
    assert.equal(markConverted.response.status, 200);

    addResult('Lead funnel seed', true, `Leads seeded (OPEN/LOST/CONVERTED with campaign ${campaignId})`);
  } catch (error) {
    addResult('Lead funnel seed', false, error.message);
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const dueFollowup = await request(`/api/leads/${leadOneId}/followups`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        followupType: 'CALL',
        followupDate: tomorrow,
        notes: 'Scheduled follow-up',
      },
    });
    assert.equal(dueFollowup.response.status, 201);

    const missedFollowup = await request(`/api/leads/${leadOneId}/followups`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        followupType: 'CALL',
        followupDate: yesterday,
        notes: 'Missed follow-up',
      },
    });
    assert.equal(missedFollowup.response.status, 201);

    if (typeof container.db?.query === 'function' && container.db.pool) {
      await container.db.query(
        `
          INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
          VALUES ($1, $2, $3, $4)
        `,
        [leadOneId, adminUserId, 'CALL_OUTBOUND', 'Call completed with customer'],
      );
    }

    addResult('Follow-up and call log seed', true, `Follow-ups created for lead ${leadOneId}`);
  } catch (error) {
    addResult('Follow-up and call log seed', false, error.message);
  }

  try {
    const createQuotation = await request('/api/quotations', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        leadId: leadOneId,
        components: [
          { itemType: 'HOTEL', description: '4N Hotel', cost: 65000 },
          { itemType: 'FLIGHT', description: 'Round trip', cost: 45000 },
          { itemType: 'TRANSFER', description: 'Airport transfers', cost: 5000 },
        ],
        marginPercent: 15,
        discount: 1000,
        taxPercent: 5,
      },
    });

    assert.equal(createQuotation.response.status, 201);
    quotationId = createQuotation.json?.data?.id;
    assert.ok(quotationId);

    const createBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        quotationId,
        travelStartDate: '2026-09-10',
        travelEndDate: '2026-09-15',
        totalAmount: 135000,
        costAmount: 115000,
        clientCurrency: 'INR',
        supplierCurrency: 'INR',
      },
    });

    assert.equal(createBooking.response.status, 201);
    bookingId = createBooking.json?.data?.id;
    assert.ok(bookingId);

    const createPayment = await request('/api/payments', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        bookingId,
        amount: 70000,
        paymentMode: 'PAYMENT_GATEWAY',
        status: 'PARTIAL',
      },
    });
    assert.equal(createPayment.response.status, 201);

    addResult('Revenue seed', true, `Quotation ${quotationId} and booking ${bookingId} created`);
  } catch (error) {
    addResult('Revenue seed', false, error.message);
  }

  try {
    if (typeof container.db?.query === 'function' && container.db.pool) {
      const supplierInsert = await container.db.query(
        `
          INSERT INTO suppliers (name, email, phone)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [`Sprint7 Supplier ${seed}`, `s7-supplier-${seed}@example.com`, '9000000000'],
      );
      supplierId = supplierInsert.rows?.[0]?.id;
    }

    const createVisa = await request('/api/visa', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        bookingId,
        supplierId,
        country: 'UAE',
        visaType: 'Tourist',
        fees: 8000,
      },
    });

    assert.equal(createVisa.response.status, 201);
    addResult('Supplier/Visa seed', true, `Visa created with supplier ${supplierId || 'N/A'}`);
  } catch (error) {
    addResult('Supplier/Visa seed', false, error.message);
  }

  try {
    const endpoints = [
      '/api/reports/dashboard/executive-kpis',
      '/api/reports/funnel/conversion',
      '/api/reports/marketing/performance',
      '/api/reports/suppliers/performance',
      '/api/reports/forecast/pipeline?periodMonths=3',
      '/api/reports/followups/call-log',
    ];

    for (const endpoint of endpoints) {
      const result = await request(endpoint, {
        headers: authHeaders(adminToken),
      });
      assert.equal(result.response.status, 200, `Expected 200 for ${endpoint}`);

      if (endpoint.includes('executive-kpis')) {
        assert.ok(typeof result.json?.data?.conversionRatePercent === 'number');
      }
      if (endpoint.includes('funnel/conversion')) {
        assert.ok(Array.isArray(result.json?.data?.funnel));
      }
      if (endpoint.includes('marketing/performance')) {
        assert.ok(Array.isArray(result.json?.data));
      }
      if (endpoint.includes('suppliers/performance')) {
        assert.ok(Array.isArray(result.json?.data));
      }
      if (endpoint.includes('forecast/pipeline')) {
        assert.equal(result.json?.data?.forecastByMonth?.length, 3);
      }
      if (endpoint.includes('followups/call-log')) {
        assert.ok(Array.isArray(result.json?.data));
      }
    }

    addResult('Advanced reports endpoints', true, 'Sprint 7 report endpoints returned expected shapes');
  } catch (error) {
    addResult('Advanced reports endpoints', false, error.message);
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

  console.log('\nSprint 7 Smoke Test Results');
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
  console.error('Sprint 7 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
