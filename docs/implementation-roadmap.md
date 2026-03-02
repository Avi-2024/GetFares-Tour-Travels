# Implementation Roadmap

## 1. Purpose
This roadmap converts the Getfares Tour & Travel CRM PRD into sprint-level execution for the current modular monolith codebase.

## 2. Scope Baseline
Included in v1:
- Auth + RBAC
- Lead capture + distribution + follow-ups
- Quotation + booking + payment + refund
- Visa operations + document tracking
- Customer management + campaigns
- Complaints/operations
- Dashboards + reports + monthly summary

Deferred to v2 unless needed earlier:
- Flight/hotel APIs
- Customer portal
- Full microservice split

## 3. Delivery Approach
- Architecture: Modular Monolith (Node.js + Express + PostgreSQL)
- API style: REST JSON
- Security: JWT + RBAC
- Migration strategy: incremental SQL migrations (`001`, `002`, ...)

## 4. Sprint Plan

## Sprint 0 (Week 1) - Foundation & Security
Goals:
- Production bootstrap hardening
- Real PostgreSQL repository adapter
- Auth and RBAC policy baseline

Deliverables:
- JWT login/register/session audit
- Role and permission seed scripts
- Request tracing, audit logs, centralized error handling
- CI checks (lint, tests, migration validation)

Exit Criteria:
- `npm run db:migrate` succeeds in fresh DB
- Auth-protected route enforcement works
- RBAC denies unauthorized actions with 403

## Sprint 1 (Week 2-3) - Lead Capture
Goals:
- Multi-channel lead intake with anti-duplication and source attribution

Deliverables:
- Website enquiry ingestion endpoint
- Meta lead webhook endpoint
- WhatsApp enquiry ingestion endpoint
- Duplicate detection logic (email/phone/source window)
- Lead scoring (Hot/Warm/Cold)

Exit Criteria:
- New leads appear in CRM within 60s from each source
- Duplicate rate reduced by configured rule set
- Source/campaign fields consistently populated

## Sprint 2 (Week 4-5) - Smart Distribution & Follow-ups
Goals:
- Automated assignment and no-miss follow-up workflow

Deliverables:
- Rule engine: destination/budget/expertise
- Round-robin fallback
- Skip user on leave/inactive
- Reassignment after inactivity threshold
- Follow-up scheduler and overdue alerts
- SLA breach flag for >15 min response

Exit Criteria:
- Every new lead gets assignment event
- Overdue follow-ups visible in dashboard
- Escalation alert fired for unattended SLA breach

## Sprint 3 (Week 6-7) - Quotation Engine
Goals:
- Fast, branded, trackable quotation lifecycle

Deliverables:
- Template-based quotation create/edit/versioning
- Cost, margin, tax, discount, final price calculations
- PDF generation and send logging
- Quote view tracking
- Reminder trigger for unopened quote

Exit Criteria:
- Consultant can create/send quote in <10 minutes with template
- Quote status transitions validated (`DRAFT -> SENT -> APPROVED/REJECTED`)
- Lead-to-quote elapsed time report available

## Sprint 4 (Week 8-9) - Booking, Payments, Refunds
Goals:
- Complete commercial flow from approved quote to settlement

Deliverables:
- Booking conversion from quote
- Advance payment rule checks (50%/100% non-refundable)
- Invoice generation hooks
- Payment verification workflow
- Refund workflow with approvals and charges

Exit Criteria:
- Booking cannot confirm without payment rule satisfaction
- Payment state transitions are auditable
- Refund status progression enforced by policy

## Sprint 5 (Week 10-11) - Visa + Operations
Goals:
- Visa case management and after-sales operations

Deliverables:
- Visa stages and document checklist
- Appointment and validity reminders
- Supplier registry linkage
- Complaint lifecycle and activity logs

Exit Criteria:
- Visa pipeline shows stage-level counts
- Missing document alerts generated automatically
- Complaints can be tracked end-to-end

## Sprint 6 (Week 12-13) - Customer + Marketing + Automation
Goals:
- Customer 360 + campaign ROI + communication automation

Deliverables:
- Customer segmentation and travel history links
- Campaign analytics (CPL, leads, revenue)
- WhatsApp template trigger engine
- Bulk communication control (RBAC restricted)

Exit Criteria:
- Segmented campaign send lists generated
- Trigger messages fire on configured business events
- Campaign performance is reportable by source

## Sprint 7 (Week 14-15) - Reporting & Management Summary
Goals:
- Real-time executive dashboard and monthly pack

Deliverables:
- KPI dashboard (leads, conversion, revenue, profit)
- Consultant/destination/source performance reports
- Funnel and lost-reason analytics
- Monthly summary export

Exit Criteria:
- Dashboard data reconciles with transactions
- Monthly summary auto-generates with filters
- CSV/PDF export available for management

## Sprint 8 (Week 16) - UAT & Production Readiness
Goals:
- Stability, observability, and rollout readiness

Deliverables:
- Load and reliability test pass
- Alerting and runbooks
- Backup/restore validation
- UAT closure report and launch checklist

Exit Criteria:
- P1 defects closed
- Rollback playbook verified
- Go-live sign-off completed

## 5. Module-to-Sprint Mapping
- Module A: Sprint 0-2 (platform + workflow backbone)
- Module B: Sprint 1
- Module C: Sprint 2
- Module D: Sprint 2 + 7
- Module E: Sprint 3
- Module F: Sprint 6
- Module G: Sprint 2
- Module H: Sprint 6
- Module I: Sprint 5
- Module J: Sprint 7
- Module K: Sprint 0 + 2
- Module L: Sprint 4 + 5
- Module M: Sprint 7
- Module N: All sprints

## 6. Database Migration Plan
Current:
- `001_initial_schema.sql` includes core CRM transactional schema.

Planned:
- `002_packages.sql` for website package publishing domain:
  - `packages`
  - `package_itineraries`
  - `package_media`
  - `package_publish_logs`
  - optional SEO and sync status fields

## 7. Non-Functional Targets
- Lead response SLA monitor: 15 minutes
- API availability target: 99.9%
- P95 API latency: <400ms for core CRUD, <1.2s for heavy reports
- Full auditability for state-changing endpoints
- Role-based access for all protected operations

## 8. Definition of Done (per module)
- DB migration complete and reversible
- API contract documented and reviewed
- Validation and RBAC checks implemented
- Unit and integration tests added
- Dashboard/report integration updated
- Audit logs emitted for create/update/status changes

## 9. Immediate Next Actions
1. Implement PostgreSQL repositories for existing modules.
2. Add seeders for roles/permissions and admin bootstrap user.
3. Start Sprint 1 endpoints (`/webhooks/meta-leads`, `/webhooks/website-enquiry`, `/webhooks/whatsapp-enquiry`).
