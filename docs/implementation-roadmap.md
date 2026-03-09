# Implementation Roadmap

## 1. Document Status
- Last updated: 2026-03-09
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
- Sprints 5 to 8: Planned.

Current smoke status:
- `npm run test:sprint1`: PASS (9/9)
- `npm run test:sprint2`: PASS (12/12)
- `npm run test:sprint3`: PASS (13/13)
- `npm run test:sprint4`: PASS (15/15)

## 4. Implemented Scope by Module
- Auth: register, login, me, JWT, login auditing hooks.
- RBAC: role assignment and permission resolution endpoint.
- Leads: create/list/get/update, auto-assign, distribution, inactive reassign, follow-ups, overdue processing, SLA breach processing.
- Webhooks: `meta-leads`, `website-enquiry`, `whatsapp-enquiry` capture with dedupe handling.
- Quotations: create/update/list/get, send, view tracking, approve/reject transition, auto booking on approval, lead-to-quote report.
- Bookings: create/list/get/update, status transition with payment-proof guard, status history, invoice generation/list.
- Payments: create/list/get/update, verify endpoint, booking payment summary synchronization.
- Refunds: create/list/get/update, approve/reject/process workflow, high-value approval guard, booking payment summary synchronization.
- Notifications: list, unread count, mark read, mark all read.
- Users/Campaigns/Customers/Visa/Complaints: baseline CRUD endpoints running with current shared payload model.

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
Status: Planned
- Stage-based visa workflow and document completeness enforcement.
- Complaint lifecycle policy.

### Sprint 6 - Customers, Marketing, Automation
Status: Planned
- Customer 360, segmentation, campaign analytics.
- Template-driven communication flows.

### Sprint 7 - Reporting and Executive Summary
Status: Planned
- KPI dashboards, funnel metrics, loss analytics, monthly summary pack.

### Sprint 8 - UAT and Production Readiness
Status: Planned
- Reliability, observability, backups, DR checklist, go-live signoff.

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
- Several non-leads modules still run generic payload validation and need PRD-specific payload contracts.
- Reporting APIs for full management dashboard are not fully exposed yet.

## 10. Next Build Priorities
1. Upgrade remaining generic modules to business payload contracts (visa/customers/campaigns/users/complaints).
2. Implement reporting module endpoints for lead, revenue, payment, visa, and productivity reports.
3. Add finance policy engine for GST/TCS, currency exchange handling, and supplier payable lifecycle.
4. Harden migration strategy around `database/migrations/database.sql` snapshot handling for production safety.
