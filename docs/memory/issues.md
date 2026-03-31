# Backend Audit Report (Issues)

Scope: Complete backend review against `Project.md` PRD and current implementation.

Date: 2026-03-18

---

**Critical Issues**

- Secrets committed in repo: `backend/.env` contains live DB credentials and Meta access token. Impact: immediate compromise risk. Fix: rotate all secrets, purge from VCS, use secret manager, add `.env` to `.gitignore`.
- Public webhook ingestion without auth/signature: `backend/src/modules/webhooks/webhooks.routes.js` and `backend/src/modules/metaWebhook/metaWebhook.routes.js` accept unauthenticated POSTs. Impact: lead spam/data poisoning/DoS. Fix: verify `X-Hub-Signature-256` for Meta, add shared secret + rate limiting for other webhooks.
- Role escalation on self-registration: `backend/src/modules/auth/auth.validation.js` allows `role`, `backend/src/modules/auth/auth.service.js` trusts it. Impact: privilege escalation to admin. Fix: remove role from public register payload, enforce default role server-side, limit role assignment to admin-only.
- RBAC assign endpoint unusable: `backend/src/modules/rbac/rbac.routes.js` requires `rbac:manage`, but `backend/src/core/constants/roles.js` never grants it. Impact: cannot manage roles via API. Fix: add `rbac:manage` to `super_admin`/`admin`.

---

**High Priority Issues**

- Lead lifecycle status mismatch vs PRD: `backend/src/modules/leads/leads.validation.js` missing PRD statuses (`NEW`, `NEGOTIATION`, `HOT/WARM/COLD`, follow-up stages). Impact: SLA workflows and reports misaligned. Fix: expand enums + DB migration + service logic alignment.
- Webhook lead creation forces `OPEN`: `backend/src/modules/webhooks/webhooks.service.js` sets `status: "OPEN"` for all inbound leads. Impact: violates PRD (new leads should be `NEW` and follow lifecycle). Fix: map to `NEW` and store source-specific metadata.
- Dashboard queries are MySQL-specific: `backend/src/modules/dashboard/dashboard.repository.js` uses `DATE_FORMAT`, `DATE_SUB`, `CURDATE`, `WEEK` which break in PostgreSQL. Impact: dashboard fails in prod. Fix: rewrite to Postgres (`date_trunc`, `current_date`, `extract`).
- Dashboard silently returns mock data on error: `backend/src/modules/dashboard/dashboard.repository.js`. Impact: ops decisions based on fake data. Fix: return error or empty data with error flag; log + alert.
- Unauthenticated quotation view tracking: `backend/src/modules/quotations/quotations.routes.js` `POST /:id/viewed` has no auth. Impact: view inflation/abuse. Fix: require signed token or auth and rate limit.
- Payment mode validation contradicts DB constraint: `backend/src/modules/payments/payments.validation.js` allows `UPI/CARD/BANK/GATEWAY`, but `backend/database/migrations/005_finance_crm_mapping.sql` allows only `CASH/BANK_TRANSFER/PAYMENT_GATEWAY`. Impact: 500s on create/update. Fix: align validation and DB constraint.
- Visa workflow incomplete vs PRD: `backend/src/modules/visa/visa.validation.js` supports only `DOCUMENT_PENDING/SUBMITTED/APPROVED/REJECTED`. Impact: PRD stages missing (Biometrics, Under Process, Delivered). Fix: extend enum and transitions.
- JWT secret policy mismatch: `backend/src/core/config/env.js` requires min 128 chars; `.env` uses 16 chars. Impact: startup failure or weak secrets. Fix: enforce 128+ and rotate.

---

**Medium Priority Issues**

- CORS wide open: `backend/.env` sets `CORS_ORIGIN=*`. Impact: larger attack surface. Fix: restrict to allowed origins.
- Meta Graph API token sent as query param: `backend/src/modules/metaWebhook/metaApi.js`. Impact: token leakage in logs/proxies. Fix: use Authorization header.
- Meta webhook batch handling fails whole batch on single error: `backend/src/modules/metaWebhook/metaLead.service.js`. Impact: retries and duplicate processing. Fix: partial success response with per-item errors.
- Followup type mismatch: DB uses `INT` (1-4) in `backend/database/migrations/database.sql`; API uses string enums in `backend/src/modules/leads/leads.validation.js`. Impact: insert/update failures. Fix: align schema or map in repository.
- Webhook payload validation uses `.passthrough()`: `backend/src/modules/webhooks/webhooks.validation.js`. Impact: accepts arbitrary fields. Fix: strict schema or whitelist.

---

**Low / Improvements**

- Webhook fallback name uses timestamp: `backend/src/modules/webhooks/webhooks.service.js`. Impact: unstable dedupe. Fix: use deterministic fallback (email/phone hash).

---

**Module-by-Module Findings**

**Auth**

- Role injection on register: `backend/src/modules/auth/auth.validation.js`, `backend/src/modules/auth/auth.service.js`.
- No password complexity beyond length: `backend/src/modules/auth/auth.validation.js`. Impact: weak passwords. Fix: enforce complexity or zxcvbn.
- No refresh tokens or session revocation for JWTs. Impact: long-lived tokens if leaked. Fix: add refresh token rotation or short TTL + revocation list.

**RBAC**

- `rbac:manage` not assigned to any role: `backend/src/core/constants/roles.js`.
- Role strings not normalized; allow invalid roles in register. Fix: validate against allowed roles.

**Users**

- Potential missing field validation for updates (check services for partial update). Impact: inconsistent user data. Fix: ensure strict schema and allowed fields only.

**Leads**

- Status enum missing PRD stages: `backend/src/modules/leads/leads.validation.js`.
- Followup type mismatch with DB: `backend/database/migrations/database.sql`.
- `closedReason` required only for `LOST` but not `NON_RESPONSIVE`: `backend/src/modules/leads/leads.validation.js`. PRD requires reason for Lost; Non‑responsive should be system-driven with audit notes.
- SLA logic only partially enforced; verify 15-minute response escalation in services (reviewed in summary).
- Lead temperature field exists but not enforced in lifecycle transitions.
- Lead assignment auto-distribution relies on `OPEN` only, not PRD `NEW` stage.

**Followups**

- Followup types not aligned with PRD (4 follow-ups + final reminder). API allows `TASK` and maps to final reminder; ensure consistent mapping and DB support.
- No uniqueness per followup attempt per lead. Impact: duplicate followups. Fix: add `(lead_id, followup_number)` uniqueness.

**Quotations**

- `/quotations/:id/viewed` unauthenticated: `backend/src/modules/quotations/quotations.routes.js`.
- `generatePdf` returns placeholder URL (from prior scan). Impact: feature incomplete. Fix: integrate actual PDF rendering/storage.
- View tracking does not update status to `VIEWED` though enum exists in DB. Impact: inaccurate status. Fix: set status on view event.
- Quote SLA response time per PRD not enforced. Fix: implement timers/alerts.

**Bookings**

- Payment policy partially enforced (50% advance/100% non-refundable present). Missing enforcement of balance before D-2 and service confirmation restrictions. Fix: implement checks in status transitions.
- Booking confirmation tied to proof URL only. Fix: require verified payment status.

**Payments**

- Payment modes mismatch with DB constraint: `backend/src/modules/payments/payments.validation.js`, `backend/database/migrations/005_finance_crm_mapping.sql`.
- No payment gateway signature verification. Impact: fraudulent payments possible. Fix: verify gateway signature with provider secret.

**Refunds**

- Refund approval threshold hardcoded. Consider configurable threshold. Ensure partial refunds consistent with ledger.

**Visa**

- Status workflow incomplete vs PRD: `backend/src/modules/visa/visa.validation.js`.
- Missing transitions and SLA checks for document collection and biometrics scheduling.

**Customers**

- Soft delete depends on `is_deleted` column; ensure consistent with DB. Risk of inconsistent visibility.

**Suppliers**

- Payment deadlines and contract compliance not enforced in logic. PRD expects reminders/alerts.

**Reports**

- Uses multiple raw SQL queries. Check all table/column names match migrations. Ensure indexes exist for heavy reports.

**Dashboard**

- PostgreSQL incompatibility and mock fallbacks: `backend/src/modules/dashboard/dashboard.repository.js`.

**Notifications**

- No rate limiting; high-volume notifications could flood DB. Consider batching or queue.

**Webhooks (generic)**

- No authentication on `/webhooks/*`. Fix: HMAC or shared secret.
- Captured leads always `OPEN` not `NEW`: `backend/src/modules/webhooks/webhooks.service.js`.

**MetaWebhook**

- No signature verification: `backend/src/modules/metaWebhook/metaWebhook.controller.js` + routes.
- Graph API access token sent via query string: `backend/src/modules/metaWebhook/metaApi.js`.
- Partial failure handling throws entire batch: `backend/src/modules/metaWebhook/metaLead.service.js`.
- Meta Lead ID uniqueness enforced in migration; good, but race handling still risk (handled with unique-violation catch).

**Packages**

- Only schema exists: `backend/src/modules/packages/packages.schema.js`. Missing routes/controllers/services for package publishing and enquiries.

**Integrations**

- WhatsApp/Email integrations missing concrete modules. PRD requires WhatsApp automation and email notifications.

---

**Database Integrity and Schema Alignment**

- Lead status enum mismatch with PRD and some services. Verify DB enums include `NEW`, `NEGOTIATION`, `HOT/WARM/COLD` if required.
- Followup type integer in `backend/database/migrations/database.sql` conflicts with API strings.
- Payment mode constraint conflicts with API.
- Review `backend/database/migrations/006_prd_completion_modules.sql` for PRD extensions and ensure code uses new fields.

---

**Security Audit Summary**

- Secrets in repo (critical).
- Webhooks unsigned (critical).
- Public register role injection (critical).
- CORS wide open (medium).
- JWT secret mismatch/weak default (high).
- No rate limiting on sensitive endpoints (high).
- No payment signature verification (high).

---

**Performance & Scalability**

- Heavy reports/dashboard queries should be indexed. Confirm indexes for `quotations(total_sale_value)`, `leads(status, created_at)`, `bookings(created_at)`, `payments(payment_mode)`.
- Dashboard uses full scans with date filters and no pagination; add indexes and aggregations.

---

**Error Handling & Reliability**

- Dashboard returns mock data on error; must surface failures.
- Webhook batch throws on partial errors; should return partial success with error list.
- Some services log warnings but swallow persistence errors; add retries or alerting for critical actions.

---

**Testing Gaps**

- No unit/integration tests for core flows. Only a smoke script exists: `backend/scripts/test-sprint1.js`.
- Required tests: lead lifecycle transitions, SLA breaches, quotation calculations, booking/payment rules, visa workflow stages, webhook validation, RBAC enforcement.

---

**Actionable Fix List (Short)**

- Rotate and remove all secrets from repo.
- Add webhook signature validation and rate limiting.
- Lock down registration roles; fix RBAC permissions.
- Align lead/visa/payment enums with PRD and DB.
- Fix dashboard SQL for Postgres and remove mock data.
- Implement packages module and missing integrations.
- Add automated tests for core flows.

---

**Finance API Surface (for integration)**

**Payments** (`/api/payments`)

- `GET /api/payments` (query: `page`, `limit`, `bookingId`, `status`, `paymentMode`, `isVerified`)
- `GET /api/payments/:id`
- `POST /api/payments`
  - Body: `bookingId` (uuid), `amount`, `currency?`, `paymentMode` enum, gateway fields (`gatewayProvider`, `gatewayOrderId`, `gatewayPaymentId`, `gatewaySignature`), `paymentReference?`, `proofUrl?`, `status?`, `paidAt?`, `isVerified?`
- `PATCH /api/payments/:id` (any subset of create fields)
- `POST /api/payments/:id/verify` (body: `paidAt?`, `status?`, `proofUrl?`, `paymentReference?`, `gatewayPaymentId?`)

**Refunds** (`/api/refunds`)

- `GET /api/refunds` (query: `page`, `limit`, `bookingId`, `paymentId`, `status`, `approvedBy`)
- `GET /api/refunds/:id`
- `POST /api/refunds`
  - Body: `bookingId` (uuid), `paymentId?`, `refundAmount`, `supplierPenalty?`, `serviceCharge?`, `gatewayRefundId?`
- `PATCH /api/refunds/:id`
- `POST /api/refunds/:id/approve` (body: `note?`, `approvedAt?`)
- `POST /api/refunds/:id/reject` (body: `reason?`, `rejectedAt?`)
- `POST /api/refunds/:id/process` (body: `gatewayRefundId?`, `processedAt?`, `markPaymentRefunded?`)

**Suppliers** (`/api/suppliers`)

- `GET /api/suppliers` (query: `page`, `limit`, `name`, `country`, `supplierCurrency`, `isActive`)
- `POST /api/suppliers`
  - Body: `name`, `contactPerson?`, `phone?`, `email?`, `panNumber?`, `gstNumber?`, `address?`, `addressLine?`, `country?`, `invoiceBeneficiaryName?`, `invoiceBankName?`, `invoiceAccountNumber?`, `invoiceIfscSwift?`, `invoiceUpiId?`, `bankName?`, `bankAccountNumber?`, `ifscCode?`, `supplierCurrency?`, `contractUrl?`, `rateValidUntil?`, `productionCommitment?`, `paymentDeadlineDate?`, `isActive?`
- `GET /api/suppliers/:id`
- `PATCH /api/suppliers/:id`

**Supplier Payables** (`/api/suppliers/:id/payables`)

- `GET /api/suppliers/:id/payables` (query: `page`, `limit`, `bookingId`, `status`)
- `POST /api/suppliers/:id/payables`
  - Body: `bookingId` (uuid), `payableAmount`, `paidAmount?`, `dueDate?`, `status?`, `paymentReference?`
- `PATCH /api/suppliers/payables/:payableId`
  - Body: any subset of payable fields

**Customers (finance fields)** (`/api/customers`)

- `GET /api/customers` (query: `page`, `limit`, `segment`, `email`, `phone`, `clientCurrency`)
- `GET /api/customers/:id`
- `POST /api/customers`
  - Body: `fullName`, `phone?`, `email?`, `preferences?`, `lifetimeValue?`, `segment?`, `panNumber?`, `addressLine?`, `clientCurrency?`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`

**Quotations (cost breakdown + currencies)** (`/api/quotations`)

- `GET /api/quotations` (query: `page`, `limit`, `status`, `leadId`, `createdBy`, `includeItems`)
- `POST /api/quotations`
  - Body (finance fields): `components[]`, `marginPercent`, `minMarginPercent?`, `discount?`, `taxPercent?`, `taxAmount?`, `supplierCost?`, `supplierTaxAmount?`, `markupAmount?`, `serviceFeeAmount?`, `gstAmount?`, `tcsAmount?`, `costCurrency?`, `clientCurrency?`, `supplierCurrency?`
- `PATCH /api/quotations/:id` (subset of above)
- Templates for payment terms/cancellation:
  - `GET /api/quotations/templates`
  - `POST /api/quotations/templates`
  - `PATCH /api/quotations/templates/:id`

**Finance DB constraint note**

- Payments `payment_mode` constraint currently only allows `CASH`, `BANK_TRANSFER`, `PAYMENT_GATEWAY` (see `backend/database/migrations/005_finance_crm_mapping.sql`). API validation allows `UPI/CARD/BANK/GATEWAY` too — these will fail unless DB constraint is expanded.
