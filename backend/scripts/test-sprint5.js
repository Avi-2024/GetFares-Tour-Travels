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
  let consultantToken;
  let visaExecToken;
  let leadId;
  let quotationId;
  let bookingId;
  let visaCaseId;
  let documentId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const adminEmail = `s5-admin-${seed}@example.com`;
    const consultantEmail = `s5-consultant-${seed}@example.com`;
    const visaExecEmail = `s5-visa-${seed}@example.com`;

    const registerAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Sprint5 Admin', email: adminEmail, password, role: 'admin' },
    });
    const registerConsultant = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Sprint5 Consultant', email: consultantEmail, password, role: 'sales_consultant' },
    });
    const registerVisaExec = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Sprint5 Visa Exec', email: visaExecEmail, password, role: 'visa_executive' },
    });

    assert.equal(registerAdmin.response.status, 201);
    assert.equal(registerConsultant.response.status, 201);
    assert.equal(registerVisaExec.response.status, 201);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });
    const loginConsultant = await request('/api/auth/login', {
      method: 'POST',
      body: { email: consultantEmail, password },
    });
    const loginVisaExec = await request('/api/auth/login', {
      method: 'POST',
      body: { email: visaExecEmail, password },
    });

    assert.equal(loginAdmin.response.status, 200);
    assert.equal(loginConsultant.response.status, 200);
    assert.equal(loginVisaExec.response.status, 200);

    adminToken = loginAdmin.json?.data?.accessToken;
    consultantToken = loginConsultant.json?.data?.accessToken;
    visaExecToken = loginVisaExec.json?.data?.accessToken;

    assert.ok(adminToken);
    assert.ok(consultantToken);
    assert.ok(visaExecToken);

    addResult('Auth setup', true, 'Admin + Consultant + Visa executive ready');
  } catch (error) {
    addResult('Auth setup', false, error.message);
  }

  try {
    const createLead = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        fullName: 'Sprint5 Lead',
        phone: `9191${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s5-lead-${seed}@example.com`,
        source: 'Meta Ads',
        travelDate: '2026-09-15',
        budget: 300000,
        autoAssign: false,
      },
    });

    assert.equal(createLead.response.status, 201);
    leadId = createLead.json?.data?.id;
    assert.ok(leadId);

    addResult('Lead create', true, `Lead created ${leadId}`);
  } catch (error) {
    addResult('Lead create', false, error.message);
  }

  try {
    const createQuotation = await request('/api/quotations', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        leadId,
        components: [
          { itemType: 'HOTEL', description: '4N Hotel', cost: 60000 },
          { itemType: 'FLIGHT', description: 'Round trip', cost: 40000 },
        ],
        marginPercent: 15,
        discount: 2500,
        taxPercent: 5,
        supplierCost: 90000,
        supplierTaxAmount: 5000,
        markupAmount: 15000,
        serviceFeeAmount: 2000,
        gstAmount: 4500,
        tcsAmount: 1000,
        costCurrency: 'USD',
        clientCurrency: 'INR',
        supplierCurrency: 'USD',
      },
    });

    assert.equal(createQuotation.response.status, 201);
    quotationId = createQuotation.json?.data?.id;
    assert.ok(quotationId);

    addResult('Quotation finance create', true, `Quotation created ${quotationId}`);
  } catch (error) {
    addResult('Quotation finance create', false, error.message);
  }

  try {
    const withoutExchangeRate = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        quotationId,
        travelStartDate: '2026-09-15',
        travelEndDate: '2026-09-20',
        totalAmount: 120000,
        costAmount: 95000,
        clientCurrency: 'INR',
        supplierCurrency: 'USD',
      },
    });

    assert.equal(withoutExchangeRate.response.status, 400);
    assert.equal(withoutExchangeRate.json?.error?.code, 'BOOKING_EXCHANGE_RATE_REQUIRED');

    addResult('Booking exchange guard', true, 'Booking creation blocked without exchangeRate');
  } catch (error) {
    addResult('Booking exchange guard', false, error.message);
  }

  try {
    const createBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        quotationId,
        travelStartDate: '2026-09-15',
        travelEndDate: '2026-09-20',
        totalAmount: 120000,
        costAmount: 95000,
        clientCurrency: 'INR',
        supplierCurrency: 'USD',
        exchangeRate: 83.25,
        exchangeLocked: true,
      },
    });

    assert.equal(createBooking.response.status, 201);
    bookingId = createBooking.json?.data?.id;
    assert.ok(bookingId);

    addResult('Booking create with exchange', true, `Booking created ${bookingId}`);
  } catch (error) {
    addResult('Booking create with exchange', false, error.message);
  }

  try {
    const createVisaCase = await request('/api/visa', {
      method: 'POST',
      headers: authHeaders(visaExecToken),
      body: {
        bookingId,
        country: 'UAE',
        visaType: 'Tourist',
        fees: 7500,
      },
    });

    assert.equal(createVisaCase.response.status, 201);
    visaCaseId = createVisaCase.json?.data?.id;
    assert.ok(visaCaseId);

    addResult('Visa case create', true, `Visa case created ${visaCaseId}`);
  } catch (error) {
    addResult('Visa case create', false, error.message);
  }

  try {
    const createDoc = await request(`/api/visa/${visaCaseId}/documents`, {
      method: 'POST',
      headers: authHeaders(visaExecToken),
      body: {
        documentType: 'PASSPORT',
        fileUrl: 'https://example.com/passport.pdf',
      },
    });

    assert.equal(createDoc.response.status, 201);
    documentId = createDoc.json?.data?.id;
    assert.ok(documentId);

    const verifyDoc = await request(`/api/visa/documents/${documentId}/verify`, {
      method: 'PATCH',
      headers: authHeaders(visaExecToken),
      body: { isVerified: true },
    });

    assert.equal(verifyDoc.response.status, 200);
    assert.equal(verifyDoc.json?.data?.isVerified, true);

    addResult('Visa document verify', true, `Document verified ${documentId}`);
  } catch (error) {
    addResult('Visa document verify', false, error.message);
  }

  try {
    const updateChecklist = await request(`/api/visa/${visaCaseId}/checklist`, {
      method: 'PATCH',
      headers: authHeaders(visaExecToken),
      body: {
        passportVerified: true,
        visaVerified: true,
        insuranceVerified: true,
        ticketVerified: true,
        hotelVerified: true,
        transferVerified: true,
        tourVerified: true,
        finalItineraryUploaded: true,
      },
    });

    assert.equal(updateChecklist.response.status, 200);
    assert.equal(updateChecklist.json?.data?.travelReady, true);

    addResult('Visa checklist update', true, 'Checklist marked travel-ready');
  } catch (error) {
    addResult('Visa checklist update', false, error.message);
  }

  try {
    const submit = await request(`/api/visa/${visaCaseId}/status`, {
      method: 'POST',
      headers: authHeaders(visaExecToken),
      body: {
        status: 'SUBMITTED',
        submissionDate: '2026-08-01',
      },
    });
    assert.equal(submit.response.status, 200);
    assert.equal(submit.json?.data?.status, 'SUBMITTED');

    const approve = await request(`/api/visa/${visaCaseId}/status`, {
      method: 'POST',
      headers: authHeaders(visaExecToken),
      body: {
        status: 'APPROVED',
        visaValidUntil: '2026-12-31',
        visaNumber: 'UAE-12345',
      },
    });
    assert.equal(approve.response.status, 200);
    assert.equal(approve.json?.data?.status, 'APPROVED');

    addResult('Visa status workflow', true, 'SUBMITTED -> APPROVED transition successful');
  } catch (error) {
    addResult('Visa status workflow', false, error.message);
  }

  try {
    const visaSummary = await request('/api/visa/reports/summary', {
      headers: authHeaders(visaExecToken),
    });
    assert.equal(visaSummary.response.status, 200);
    assert.ok(typeof visaSummary.json?.data?.totalCases === 'number');

    addResult('Visa summary report', true, `Total cases ${visaSummary.json?.data?.totalCases}`);
  } catch (error) {
    addResult('Visa summary report', false, error.message);
  }

  try {
    const endpoints = [
      '/api/reports/leads/by-source',
      '/api/reports/revenue/monthly',
      '/api/reports/visa/summary',
      '/api/reports/monthly-summary',
    ];

    for (const endpoint of endpoints) {
      const result = await request(endpoint, {
        headers: authHeaders(adminToken),
      });
      assert.equal(result.response.status, 200, `Expected 200 for ${endpoint}`);
    }

    addResult('Management reports', true, 'Lead/Revenue/Visa/Monthly summary reports returned 200');
  } catch (error) {
    addResult('Management reports', false, error.message);
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

  console.log('\nSprint 5 Smoke Test Results');
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
  console.error('Sprint 5 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
