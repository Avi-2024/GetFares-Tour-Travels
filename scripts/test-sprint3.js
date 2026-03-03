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

  const seed = randomUUID().slice(0, 8);
  const password = 'StrongPass123';

  let adminToken;
  let managerToken;
  let consultantToken;
  let leadId;
  let templateId;
  let quotationId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const adminEmail = `s3-admin-${seed}@example.com`;
    const managerEmail = `s3-manager-${seed}@example.com`;
    const consultantEmail = `s3-consultant-${seed}@example.com`;

    const registerAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint3 Admin',
        email: adminEmail,
        password,
        role: 'admin',
      },
    });

    const registerManager = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint3 Manager',
        email: managerEmail,
        password,
        role: 'manager',
      },
    });

    const registerConsultant = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint3 Consultant',
        email: consultantEmail,
        password,
        role: 'sales_consultant',
      },
    });

    assert.equal(registerAdmin.response.status, 201);
    assert.equal(registerManager.response.status, 201);
    assert.equal(registerConsultant.response.status, 201);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });

    const loginManager = await request('/api/auth/login', {
      method: 'POST',
      body: { email: managerEmail, password },
    });

    const loginConsultant = await request('/api/auth/login', {
      method: 'POST',
      body: { email: consultantEmail, password },
    });

    assert.equal(loginAdmin.response.status, 200);
    assert.equal(loginManager.response.status, 200);
    assert.equal(loginConsultant.response.status, 200);

    adminToken = loginAdmin.json?.data?.accessToken;
    managerToken = loginManager.json?.data?.accessToken;
    consultantToken = loginConsultant.json?.data?.accessToken;

    assert.ok(adminToken);
    assert.ok(managerToken);
    assert.ok(consultantToken);

    addResult('Auth setup', true, 'Admin + Manager + Consultant ready');
  } catch (error) {
    addResult('Auth setup', false, error.message);
  }

  try {
    const lead = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        fullName: 'Sprint3 Lead',
        phone: `9199${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s3-lead-${seed}@example.com`,
        source: 'Website',
        travelDate: '2026-06-20',
        budget: 200000,
        status: 'OPEN',
        autoAssign: false,
      },
    });

    assert.equal(lead.response.status, 201);
    leadId = lead.json?.data?.id;
    assert.ok(leadId);

    addResult('Lead create', true, `Lead created ${leadId}`);
  } catch (error) {
    addResult('Lead create', false, error.message);
  }

  try {
    const createTemplate = await request('/api/quotations/templates', {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        code: `READY_${seed}`,
        name: 'Ready Package Template',
        templateType: 'READY_PACKAGE',
        headerBranding: 'Getfares Branding',
        inclusions: 'Hotel, Flight, Transfer',
        exclusions: 'Personal expenses',
        paymentTerms: '50% advance',
        cancellationPolicy: 'Standard policy',
        footerDisclaimer: 'Company terms apply',
        minMarginPercent: 10,
        isActive: true,
      },
    });

    assert.equal(createTemplate.response.status, 201);
    templateId = createTemplate.json?.data?.id;
    assert.ok(templateId);

    addResult('Template create (admin)', true, `Template created ${templateId}`);
  } catch (error) {
    addResult('Template create (admin)', false, error.message);
  }

  try {
    const createQuote = await request('/api/quotations', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        leadId,
        templateId,
        components: [
          {
            itemType: 'HOTEL',
            description: '4N Hotel',
            cost: 50000,
          },
          {
            itemType: 'FLIGHT',
            description: 'Roundtrip flight',
            cost: 30000,
          },
        ],
        marginPercent: 5,
        discount: 1000,
        taxPercent: 5,
        expiresInHours: 48,
      },
    });

    assert.equal(createQuote.response.status, 201);
    quotationId = createQuote.json?.data?.id;
    assert.ok(quotationId);
    assert.equal(Boolean(createQuote.json?.data?.requiresApproval), true);
    assert.equal(createQuote.json?.data?.status, 'DRAFT');

    addResult('Quotation create', true, `Quotation created ${quotationId} with approval flag`);
  } catch (error) {
    addResult('Quotation create', false, error.message);
  }

  try {
    const sendBeforeApproval = await request(`/api/quotations/${quotationId}/send`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        channel: 'EMAIL',
        recipientEmail: `client-${seed}@example.com`,
      },
    });

    assert.equal(sendBeforeApproval.response.status, 409);
    assert.equal(sendBeforeApproval.json?.error?.code, 'QUOTATION_MARGIN_APPROVAL_REQUIRED');

    addResult('Margin guard before send', true, 'Send blocked before approval');
  } catch (error) {
    addResult('Margin guard before send', false, error.message);
  }

  try {
    const approveMargin = await request(`/api/quotations/${quotationId}/approve-margin`, {
      method: 'POST',
      headers: authHeaders(managerToken),
      body: {
        note: 'Approved for strategic pricing',
      },
    });

    assert.equal(approveMargin.response.status, 200);
    assert.equal(Boolean(approveMargin.json?.data?.requiresApproval), false);

    addResult('Margin approval', true, 'Manager approval completed');
  } catch (error) {
    addResult('Margin approval', false, error.message);
  }

  try {
    const sendQuote = await request(`/api/quotations/${quotationId}/send`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        channel: 'EMAIL',
        recipientEmail: `client-${seed}@example.com`,
        message: 'Please review quotation',
      },
    });

    assert.equal(sendQuote.response.status, 200);
    assert.equal(sendQuote.json?.data?.status, 'SENT');
    assert.ok(sendQuote.json?.data?.pdfUrl);

    addResult('Send quote', true, 'Quote sent and PDF linked');
  } catch (error) {
    addResult('Send quote', false, error.message);
  }

  try {
    const viewQuote = await request(`/api/quotations/${quotationId}/viewed`, {
      method: 'POST',
      body: {
        deviceInfo: 'Browser-Desktop',
      },
    });

    assert.equal(viewQuote.response.status, 200);
    assert.equal(viewQuote.json?.data?.status, 'VIEWED');
    assert.ok(Number(viewQuote.json?.data?.viewCount) >= 1);

    const listViews = await request(`/api/quotations/${quotationId}/views`, {
      headers: authHeaders(consultantToken),
    });

    assert.equal(listViews.response.status, 200);
    assert.ok(Array.isArray(listViews.json?.data));
    assert.ok(listViews.json.data.length >= 1);

    addResult('Quote engagement tracking', true, `Views tracked: ${listViews.json.data.length}`);
  } catch (error) {
    addResult('Quote engagement tracking', false, error.message);
  }

  try {
    const approveStatus = await request(`/api/quotations/${quotationId}/status`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        status: 'APPROVED',
        travelStartDate: '2026-06-20',
        travelEndDate: '2026-06-25',
      },
    });

    assert.equal(approveStatus.response.status, 200);
    assert.equal(approveStatus.json?.data?.quotation?.status, 'APPROVED');
    assert.ok(approveStatus.json?.data?.booking?.id);

    addResult('Status approved + booking', true, `Booking created ${approveStatus.json.data.booking.id}`);
  } catch (error) {
    addResult('Status approved + booking', false, error.message);
  }

  try {
    const versions = await request(`/api/quotations/${quotationId}/versions`, {
      headers: authHeaders(consultantToken),
    });

    const sendLogs = await request(`/api/quotations/${quotationId}/send-logs`, {
      headers: authHeaders(consultantToken),
    });

    assert.equal(versions.response.status, 200);
    assert.equal(sendLogs.response.status, 200);
    assert.ok(Array.isArray(versions.json?.data));
    assert.ok(Array.isArray(sendLogs.json?.data));
    assert.ok(versions.json.data.length >= 2);
    assert.ok(sendLogs.json.data.length >= 1);

    addResult('Versioning and send logs', true, `Versions=${versions.json.data.length}, Sends=${sendLogs.json.data.length}`);
  } catch (error) {
    addResult('Versioning and send logs', false, error.message);
  }

  try {
    const notOpenedQuote = await request('/api/quotations', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        leadId,
        templateId,
        components: [
          {
            itemType: 'VISA',
            description: 'Visa processing',
            cost: 8000,
          },
        ],
        marginPercent: 12,
        discount: 0,
        taxPercent: 0,
        expiresInHours: 24,
      },
    });

    assert.equal(notOpenedQuote.response.status, 201);
    const notOpenedId = notOpenedQuote.json?.data?.id;
    assert.ok(notOpenedId);

    await request(`/api/quotations/${notOpenedId}/send`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        channel: 'WHATSAPP',
        recipientPhone: '919999999999',
      },
    });

    await container.db.update('quotations', notOpenedId, {
      sent_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      status: 'SENT',
      view_count: 0,
      last_viewed_at: null,
    });

    const runReminders = await request('/api/quotations/reminders/run', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        notOpenedHours: 24,
        viewedNoActionHours: 48,
      },
    });

    assert.equal(runReminders.response.status, 200);
    assert.ok(Number(runReminders.json?.data?.triggered) >= 1);

    addResult('Reminder automation', true, `Triggered=${runReminders.json.data.triggered}`);
  } catch (error) {
    addResult('Reminder automation', false, error.message);
  }

  try {
    const report = await request('/api/quotations/reports/lead-to-quote', {
      headers: authHeaders(managerToken),
    });

    assert.equal(report.response.status, 200);
    assert.ok(report.json?.data?.overall);
    assert.ok(Array.isArray(report.json?.data?.byConsultant));

    addResult('Lead-to-quote report', true, `Total quotes=${report.json.data.overall.totalQuotes}`);
  } catch (error) {
    addResult('Lead-to-quote report', false, error.message);
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

  console.log('\nSprint 3 Smoke Test Results');
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
  console.error('Sprint 3 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
