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

  function authHeaders(token) {
    return { authorization: `Bearer ${token}` };
  }

  const seed = randomUUID().slice(0, 8);
  const password = 'StrongPass123';

  let adminToken;
  let accountsToken;
  let consultantToken;
  let leadId;
  let quotationId;
  let bookingId;
  let paymentId;
  let refundId;

  try {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    addResult('Health endpoint', true, 'GET /health returned 200');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const adminEmail = `s4-admin-${seed}@example.com`;
    const accountsEmail = `s4-accounts-${seed}@example.com`;
    const consultantEmail = `s4-consultant-${seed}@example.com`;

    const registerAdmin = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint4 Admin',
        email: adminEmail,
        password,
        role: 'admin',
      },
    });

    const registerAccounts = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint4 Accounts',
        email: accountsEmail,
        password,
        role: 'accounts',
      },
    });

    const registerConsultant = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sprint4 Consultant',
        email: consultantEmail,
        password,
        role: 'sales_consultant',
      },
    });

    assert.equal(registerAdmin.response.status, 201);
    assert.equal(registerAccounts.response.status, 201);
    assert.equal(registerConsultant.response.status, 201);

    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });
    const loginAccounts = await request('/api/auth/login', {
      method: 'POST',
      body: { email: accountsEmail, password },
    });
    const loginConsultant = await request('/api/auth/login', {
      method: 'POST',
      body: { email: consultantEmail, password },
    });

    assert.equal(loginAdmin.response.status, 200);
    assert.equal(loginAccounts.response.status, 200);
    assert.equal(loginConsultant.response.status, 200);

    adminToken = loginAdmin.json?.data?.accessToken;
    accountsToken = loginAccounts.json?.data?.accessToken;
    consultantToken = loginConsultant.json?.data?.accessToken;

    assert.ok(adminToken);
    assert.ok(accountsToken);
    assert.ok(consultantToken);

    addResult('Auth setup', true, 'Admin + Accounts + Consultant ready');
  } catch (error) {
    addResult('Auth setup', false, error.message);
  }

  try {
    const createLead = await request('/api/leads', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        fullName: 'Sprint4 Lead',
        phone: `9195${Math.floor(100000 + Math.random() * 900000)}`,
        email: `s4-lead-${seed}@example.com`,
        source: 'Website',
        travelDate: '2026-08-10',
        budget: 250000,
        status: 'OPEN',
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
          { itemType: 'HOTEL', description: '3N Hotel', cost: 45000 },
          { itemType: 'FLIGHT', description: 'Round trip', cost: 30000 },
        ],
        marginPercent: 15,
        discount: 0,
        taxPercent: 5,
      },
    });

    assert.equal(createQuotation.response.status, 201);
    quotationId = createQuotation.json?.data?.id;
    assert.ok(quotationId);

    addResult('Quotation create', true, `Quotation created ${quotationId}`);
  } catch (error) {
    addResult('Quotation create', false, error.message);
  }

  try {
    const createBooking = await request('/api/bookings', {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        quotationId,
        travelStartDate: '2026-08-10',
        travelEndDate: '2026-08-15',
        totalAmount: 100000,
        costAmount: 78000,
        isNonRefundable: false,
      },
    });

    assert.equal(createBooking.response.status, 201);
    bookingId = createBooking.json?.data?.id;
    assert.ok(bookingId);
    assert.equal(createBooking.json?.data?.status, 'PENDING');
    assert.equal(createBooking.json?.data?.paymentStatus, 'PENDING');
    assert.equal(Number(createBooking.json?.data?.advanceRequired), 50000);

    addResult('Booking create', true, `Booking created ${bookingId}`);
  } catch (error) {
    addResult('Booking create', false, error.message);
  }

  try {
    const prematureConfirm = await request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        status: 'CONFIRMED',
      },
    });

    assert.equal(prematureConfirm.response.status, 409);
    assert.equal(prematureConfirm.json?.error?.code, 'BOOKING_ADVANCE_NOT_MET');
    addResult('Booking confirm blocked', true, 'Confirmation blocked before payment policy is met');
  } catch (error) {
    addResult('Booking confirm blocked', false, error.message);
  }

  try {
    const createPayment = await request('/api/payments', {
      method: 'POST',
      headers: authHeaders(accountsToken),
      body: {
        bookingId,
        amount: 50000,
        currency: 'INR',
        paymentMode: 'BANK_TRANSFER',
        paymentReference: `S4-REF-${seed}`,
        proofUrl: 'https://example.com/payment-proof.pdf',
      },
    });

    assert.equal(createPayment.response.status, 201);
    paymentId = createPayment.json?.data?.id;
    assert.ok(paymentId);

    addResult('Payment create', true, `Payment created ${paymentId}`);
  } catch (error) {
    addResult('Payment create', false, error.message);
  }

  try {
    const verifyPayment = await request(`/api/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: authHeaders(accountsToken),
      body: {
        status: 'FULL',
      },
    });

    assert.equal(verifyPayment.response.status, 200);
    assert.equal(Boolean(verifyPayment.json?.data?.isVerified), true);
    assert.equal(verifyPayment.json?.data?.bookingPaymentStatus, 'PARTIAL');

    addResult('Payment verify', true, 'Payment verified and booking summary updated');
  } catch (error) {
    addResult('Payment verify', false, error.message);
  }

  try {
    const confirmAfterPayment = await request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {
        status: 'CONFIRMED',
      },
    });

    assert.equal(confirmAfterPayment.response.status, 200);
    assert.equal(confirmAfterPayment.json?.data?.status, 'CONFIRMED');

    addResult('Booking confirm success', true, 'Booking confirmed after verified advance');
  } catch (error) {
    addResult('Booking confirm success', false, error.message);
  }

  try {
    const generateInvoice = await request(`/api/bookings/${bookingId}/invoices/generate`, {
      method: 'POST',
      headers: authHeaders(consultantToken),
      body: {},
    });

    assert.equal(generateInvoice.response.status, 201);
    assert.ok(generateInvoice.json?.data?.invoiceNumber);

    addResult('Invoice generation', true, `Invoice ${generateInvoice.json.data.invoiceNumber}`);
  } catch (error) {
    addResult('Invoice generation', false, error.message);
  }

  try {
    const createRefund = await request('/api/refunds', {
      method: 'POST',
      headers: authHeaders(accountsToken),
      body: {
        bookingId,
        paymentId,
        refundAmount: 15000,
        serviceCharge: 500,
      },
    });

    assert.equal(createRefund.response.status, 201);
    refundId = createRefund.json?.data?.id;
    assert.ok(refundId);
    assert.equal(createRefund.json?.data?.status, 'INITIATED');

    addResult('Refund create', true, `Refund created ${refundId}`);
  } catch (error) {
    addResult('Refund create', false, error.message);
  }

  try {
    const approveByAccounts = await request(`/api/refunds/${refundId}/approve`, {
      method: 'POST',
      headers: authHeaders(accountsToken),
      body: {
        note: 'Attempted approval by accounts',
      },
    });

    assert.equal(approveByAccounts.response.status, 403);
    assert.equal(approveByAccounts.json?.error?.code, 'REFUND_MANAGER_APPROVAL_REQUIRED');

    addResult('High-value approval guard', true, 'Accounts blocked for high-value refund approval');
  } catch (error) {
    addResult('High-value approval guard', false, error.message);
  }

  try {
    const approveByAdmin = await request(`/api/refunds/${refundId}/approve`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: {
        note: 'Approved by admin',
      },
    });

    assert.equal(approveByAdmin.response.status, 200);
    assert.equal(approveByAdmin.json?.data?.status, 'APPROVED');

    addResult('Refund approve', true, 'High-value refund approved by admin');
  } catch (error) {
    addResult('Refund approve', false, error.message);
  }

  try {
    const processRefund = await request(`/api/refunds/${refundId}/process`, {
      method: 'POST',
      headers: authHeaders(accountsToken),
      body: {
        gatewayRefundId: `RFND-${seed}`,
      },
    });

    assert.equal(processRefund.response.status, 200);
    assert.equal(processRefund.json?.data?.status, 'PROCESSED');
    assert.equal(processRefund.json?.data?.bookingPaymentStatus, 'PARTIAL');

    addResult('Refund process', true, 'Refund processed and booking payment summary synced');
  } catch (error) {
    addResult('Refund process', false, error.message);
  }

  try {
    const bookingAfterRefund = await request(`/api/bookings/${bookingId}`, {
      headers: authHeaders(consultantToken),
    });

    assert.equal(bookingAfterRefund.response.status, 200);
    assert.equal(bookingAfterRefund.json?.data?.paymentStatus, 'PARTIAL');
    assert.equal(Number(bookingAfterRefund.json?.data?.advanceReceived), 35000);

    addResult('Booking payment snapshot', true, 'advanceReceived=35000, paymentStatus=PARTIAL');
  } catch (error) {
    addResult('Booking payment snapshot', false, error.message);
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

  console.log('\nSprint 4 Smoke Test Results');
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
  console.error('Sprint 4 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
