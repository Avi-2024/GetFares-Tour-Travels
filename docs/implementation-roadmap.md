# Implementation Roadmap

## 1. Document Status
- Last updated: 2026-03-10
- Product: Getfares Tour & Travel CRM
- Architecture: Modular Monolith (`Node.js + Express + PostgreSQL`)
- API style: REST JSON with JWT + RBAC

## 2. Delivery Objective
This roadmap maps the PRD into executable backend increments while keeping modules independently extractable into microservices later.

## 3. Current Backend State (As Implemented)
- Sprint 1 (Lead Capture): Completed and smoke-tested.
- Sprint 2 (Distribution + Follow-up + SLA): Completed and smoke-tested.
- Sprint 3 (Quotation Engine): Completed baseline and validated.
- Sprint 4 (Booking + Payments + Refunds): Completed baseline and validated.
- Sprint 5 (Visa + Reporting Baseline + Finance Guards): Completed and smoke-tested.
- Sprint 6 (Customers + Marketing Baseline): Completed and smoke-tested.
- Sprint 7 (Advanced Reporting Packs): Completed and smoke-tested.
- Sprint 8 (UAT + Production Readiness Baseline): Completed and smoke-tested.

Current smoke status:
- `npm run test:sprint1`: PASS (9/9)
- `npm run test:sprint2`: PASS (12/12)
- `npm run test:sprint3`: PASS (13/13)
- `npm run test:sprint4`: PASS (15/15)
- `npm run test:sprint5`: PASS (12/12)
- `npm run test:sprint6`: PASS (6/6)
- `npm run test:sprint7`: PASS (8/8)
- `npm run test:sprint8`: PASS (5/5)

## 4. Implemented Scope by Module
- Auth: register, login, me, JWT, login auditing hooks.
- RBAC: role assignment and permission resolution endpoint.
- Leads: create/list/get/update, auto-assign, distribution, inactive reassign, follow-ups, overdue processing, SLA breach processing.
- Webhooks: `meta-leads`, `website-enquiry`, `whatsapp-enquiry` capture with dedupe handling.
- Quotations: create/update/list/get, send, view tracking, approve/reject transition, auto booking on approval, lead-to-quote report.
- Bookings: create/list/get/update, status transition with payment-proof guard, status history, invoice generation/list.
- Payments: create/list/get/update, verify endpoint, booking payment summary synchronization.
- Refunds: create/list/get/update, approve/reject/process workflow, high-value approval guard, booking payment summary synchronization.
- Visa: create/list/get/update, status transition workflow, document upload/verify, checklist retrieval/update, visa summary report.
- Reports: lead, revenue, payment, visa, follow-up, monthly-summary, call-log, executive KPI pack, conversion funnel, marketing performance, supplier performance, and pipeline forecast analytics endpoints.
- Notifications: list, unread count, mark read, mark all read.
- Users/Campaigns/Customers/Complaints: PRD-aligned business payload contracts with complaints activity workflow.

## 5. Lead Temperature Logic (Business-Aligned)
Current implementation uses `HOT/WARM/COLD` determination (not a mandatory lead-score model):
- HOT: travel date within 30 days, or high budget plus positive response.
- WARM: travel date in 30 to 90 days, or positive response.
- COLD: low urgency and exploratory behavior.

## 6. Sprint Plan and Status

### Sprint 0 - Foundation and Security
Status: Completed
- Modular monolith bootstrapped.
- Common error handling, middleware, logger.
- Auth and RBAC baseline wired.

### Sprint 1 - Automatic Lead Capture
Status: Completed
- Lead CRUD with anti-dup behavior.
- Webhook intake for Meta, Website, WhatsApp.
- Source and campaign metadata intake.

### Sprint 2 - Smart Distribution and Follow-ups
Status: Completed
- Auto assignment and distribution controls.
- Reassign inactive assignees.
- Follow-up creation and overdue processors.
- SLA breach detection and escalation eventing.

### Sprint 3 - Quotation Engine
Status: Completed (current baseline)
- Implemented: template CRUD, quote create/update/send/view/approve-reject, booking conversion, lead-to-quote report.
- Implemented: margin approval guard before send.
- Implemented: persistent version history and send logs.
- Implemented: reminder automation with reminder logging and event triggers.

### Sprint 4 - Booking, Payments, Refunds
Status: Completed (current baseline)
- Implemented: booking creation policy, advance rules, confirmation guard with verified proof.
- Implemented: booking status history and invoice generation/listing APIs.
- Implemented: payment verify flow and booking payment summary sync (`advance_received`, `payment_status`).
- Implemented: refund approval workflow (`INITIATED -> APPROVED/REJECTED -> PROCESSED`) with high-value approval guard.

### Sprint 5 - Visa and Operations
Status: Completed (current baseline)
- Implemented: stage-based visa workflow with transition validation.
- Implemented: visa document upload + verification APIs.
- Implemented: documentation checklist update and `travelReady` computation.
- Implemented: visa summary report endpoint.
- Implemented: finance guardrails for booking exchange-rate validation in service layer.

### Sprint 6 - Customers, Marketing, Automation
Status: Completed (current baseline)
- Implemented: users/campaigns/customers/complaints payload contracts aligned to business fields.
- Implemented: complaints activity workflow endpoints.
- Implemented: campaign analytics baseline coverage in reporting layer (`/reports/marketing/performance`).

### Sprint 7 - Reporting and Executive Summary
Status: Completed (current increment)
- Implemented: lead source/consultant/aging/lost reports.
- Implemented: revenue by month/service-type/destination.
- Implemented: outstanding/payment-mode/profit-margin reports.
- Implemented: follow-up today/missed and monthly summary report.
- Implemented: follow-up call-log report.
- Implemented: executive KPI dashboard pack.
- Implemented: conversion funnel report.
- Implemented: marketing performance and supplier performance reports.
- Implemented: pipeline forecast and seasonal trend output.

### Sprint 8 - UAT and Production Readiness
Status: Completed (baseline hardening)
- Implemented: liveness and readiness endpoints (`/health/live`, `/health/ready`) with DB health checks.
- Implemented: runtime drain mode for shutdown that returns readiness `503`.
- Implemented: graceful shutdown flow for HTTP, Socket.IO, and DB connection close on `SIGINT`/`SIGTERM`.
- Implemented: new runtime config/env controls (`APP_VERSION`, DB health timeout, shutdown timeout).
- Implemented: observability metrics endpoints (`/metrics`, `/metrics/json`) with optional token guard.
- Implemented: DB backup and restore scripts (`db:backup`, `db:restore`) for operational drills.
- Implemented: UAT and go-live checklist document for release governance.
- Implemented: Sprint 8 smoke suite (`test:sprint8`) for health and readiness behavior.

## 7. Data and Migration Strategy
Current schema source used for alignment:
- `database/migrations/database.sql`

Execution policy:
- Never rewrite already-applied production migrations.
- Introduce forward-only numbered migrations (`004_*`, `005_*`, ...).
- Keep seed scripts idempotent (`db:seed:rbac`).

## 8. Finance Mapping Coverage
From latest schema updates:
- Client onboarding fields included: PAN, address, contact, currency context.
- Supplier onboarding fields included: PAN, GST, address, bank details, supplier currency.
- Cost/accounting entities included: supplier payables, tax ledger, exchange rates, refund charges.

Still pending in service-layer behavior:
- Full tax calculation workflow (GST/TCS posting rules).
- Currency conversion locking and accounting postings in transaction services.

## 9. Risks and Gaps
- Sprint 3 now depends on quotation enhancement tables/columns from migration `003_quotation_engine_sprint3.sql`.
- Reporting coverage is now broad, but forecasting logic is baseline heuristic and can be improved with model-based forecasting in future.
- Finance policy engine (GST/TCS accounting postings and payables lifecycle) still needs deeper transactional enforcement.

## 10. Next Build Priorities
1. Add finance policy engine for GST/TCS posting, currency conversion locking, and supplier payable lifecycle.
2. Improve forecasting quality (seasonality + weighted pipeline + confidence bands).
3. Complete remaining production hardening execution: run DR drills, configure alerting, and finish UAT signoffs.
4. Harden migration strategy around forward-only production-safe migration flow and snapshot governance.
