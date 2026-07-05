# Get to Viccation / Get2Vacations CRM - Software Requirements Analysis

## Document Control

| Item | Details |
|---|---|
| Project Name | Get to Viccation / Get2Vacations CRM |
| Business Domain | Travel CRM, tours, visa, bookings, payments, refunds, lead management, Meta Lead Ads, WhatsApp, reports, multi-currency operations |
| Document Type | Software Requirements Analysis and Product Breakdown |
| Intended Audience | Client, product manager, project manager, UI/UX designer, backend developer, frontend developer, QA, DevOps, business analyst |
| Source of Truth | Existing Travel CRM codebase, frontend routes, backend modules, existing docs/Postman artifacts, and provided prompt |
| Last Updated | 2026-06-26 |

> This document separates confirmed implementation details from assumptions. Where business requirements are unavailable, assumptions are marked with reason and recommended best practice.

---

# 1. Project Overview

## Project Name

**Get to Viccation / Get2Vacations CRM**

## Project Vision

Create a centralized Travel CRM platform that manages the complete customer journey from lead capture to quotation, booking, payment, refund, supplier coordination, reporting, and partner CRM synchronization.

## Brief Description

Get2Vacations CRM is a web-based CRM and operations platform for travel, tours, and visa businesses. It supports lead management, Meta Lead Ads ingestion, sales assignment, quotation building, booking management, payments, refunds, suppliers, customers, campaigns, reports, dashboards, WhatsApp, currency handling, and Breezer CRM booking webhook integration.

## Business Goal

Improve sales conversion, reduce manual operations, centralize booking and finance tracking, enforce follow-up discipline, and provide management visibility across India and UAE operations.

## Target Users

| User Group | Description |
|---|---|
| Super Admin | Full system owner with complete access. |
| Admin / Manager | Operational manager for team, country, market, or branch. |
| Sales Consultant | Handles assigned leads, follow-ups, quotations, and conversions. |
| Visa Consultant | Handles visa-related leads and visa cases. |
| Finance User | Handles payments, refunds, outstanding amounts, and finance reports. |
| Operations User | Handles bookings, suppliers, complaints, and fulfillment. |
| Marketing User | Tracks campaigns and Meta lead rules. |
| Customer Support | Handles complaints and customer communication. |
| External CRM / Breezer | Receives booking data through webhook integration. |
| Customer | Travel or visa customer whose information is managed in CRM. |
| Supplier / Vendor | Provides travel, hotel, visa, excursion, flight, or land arrangement services. |

## Business Problem

Travel businesses often manage leads, quotations, bookings, payments, suppliers, and reports in disconnected systems. This causes duplicate work, delayed follow-ups, weak payment visibility, inconsistent assignment, and poor reporting.

## Proposed Solution

Create a single CRM platform that:

- Captures leads manually and from Meta Lead Ads.
- Assigns leads based on role, market, and business rules.
- Tracks status, follow-ups, SLA, and compliance.
- Builds quotations and converts approved quotations into bookings.
- Tracks payments, refunds, outstanding amounts, and currency.
- Provides dashboards and reports for leadership.
- Pushes booking data to Breezer CRM.

## Expected Benefits

| Benefit | Expected Result |
|---|---|
| Centralized operations | Sales, bookings, payments, refunds, and reporting work from one platform. |
| Faster lead response | Assignment and SLA tracking reduce delays. |
| Better sales visibility | Managers can monitor conversion and consultant performance. |
| Better finance control | Payments, refunds, outstanding amounts, and currencies are visible. |
| Reduced manual effort | Meta lead capture and Breezer booking webhook reduce duplicate entry. |
| Better reporting | Dashboard and reports support business decisions. |

## Unique Selling Points

- Travel-specific CRM workflows.
- Meta Lead Ads rule-based mapping.
- India and UAE market segmentation.
- Quotation-to-booking lifecycle.
- Multi-currency operations and reporting.
- Follow-up compliance tracking.
- Breezer CRM booking webhook integration.
- Role-based visibility for managers and consultants.

## Scope of the Project

Confirmed scope includes authentication, RBAC, users, leads, Meta lead mapping, quotations, bookings, payments, refunds, suppliers, customers, campaigns, packages, destinations, visa cases, complaints, dashboard, reports, notifications, WhatsApp, currency, website enquiries, and Breezer booking webhook integration.

Assumption:

- The product may later evolve into multi-branch or multi-tenant SaaS. Reason: branch, country, role, market, and integration requirements are already present. Recommended best practice: explicitly define tenant and branch ownership before scaling to multiple companies.

---

# 2. Project Description

## What The Platform Is

Get2Vacations CRM is a travel CRM and operations management system for sales, operations, finance, management, and external integrations.

## What Users Can Do

- Login and access role-based modules.
- Create and manage leads.
- Capture Meta leads automatically.
- Assign leads to consultants and managers.
- Update follow-up history, status, notes, qualification, and SLA.
- Create, edit, send, and approve quotations.
- Convert approved quotations into bookings.
- Create and track payments and refunds.
- Manage suppliers, customers, destinations, campaigns, packages, visa cases, and complaints.
- View dashboards and reports.
- Configure Meta lead rules.
- Push booking data to Breezer CRM.

## Main Business Workflow

```text
Lead captured
  -> Lead assigned
  -> Consultant follows up
  -> Lead qualified
  -> Quotation created
  -> Quotation sent / approved
  -> Booking created
  -> Payment collected
  -> Supplier / operations handled
  -> Refund or complaint handled if needed
  -> Reports and dashboard updated
  -> Booking synced to Breezer CRM if enabled
```

## End-To-End User Journey

1. Customer submits inquiry from Meta, website, referral, walk-in, or manual source.
2. CRM creates a lead and applies source, country, currency, and destination mapping where available.
3. Lead is assigned to a consultant or manager.
4. Consultant follows up and updates status, qualification, and notes.
5. Consultant creates and sends quotation.
6. Approved quotation is converted into booking.
7. Finance records payments and tracks outstanding balance.
8. Refunds or complaints are handled where applicable.
9. Management monitors KPIs and reports.
10. Booking-created payload is pushed to Breezer CRM.

## High-Level Architecture Overview

| Layer | Confirmed / Observed Components |
|---|---|
| Frontend | React CRM frontend with pages for dashboard, leads, quotations, bookings, payments, refunds, reports, Meta configuration, customers, suppliers, campaigns, notifications, visa cases, complaints, packages, and destinations. |
| Backend | Node.js / Express modular backend under `backend/crm/modules`. |
| Database | MySQL-based persistence with migrations and repository pattern. |
| Auth/RBAC | Auth and RBAC modules with protected frontend routes and backend authorization middleware. |
| Integrations | Meta webhook, WhatsApp, website enquiries, Breezer booking webhook, currency service. |
| Observability | Structured logging and request logging are present. |

---

# 3. Client Requirements

## Confirmed Client Requirements

| Category | Requirement |
|---|---|
| Lead Management | System must support manual and Meta Lead Ads lead creation. |
| Assignment | Leads must be assigned to sales users or managers based on existing business rules. |
| Visibility | Sales consultants should see assigned data; managers should see relevant team/market data. |
| Market Segmentation | System must support India and UAE views. |
| Quotations | Users must create and manage travel quotations. |
| Bookings | Users must create and manage bookings from approved quotations. |
| Payments | System must create and track booking payments with correct currency. |
| Refunds | System must manage refunds. |
| Reports | System must provide performance, booking, lead, and finance reports. |
| Dashboard | System must show operational KPIs and revenue performance. |
| Integrations | System must ingest Meta leads and send booking-created payloads to Breezer CRM. |
| Multi-Currency | System must handle AED, INR, USD, and other supported currencies. |

## Assumed Client Requirements

### Functional Requirements

| Requirement | Assumption | Reason | Recommended Best Practice |
|---|---|---|---|
| Customer portal | Customers may need self-service later. | Travel businesses often need booking/payment visibility for customers. | Add after internal CRM stabilizes. |
| Supplier portal | Suppliers may need access to assigned service items. | Supplier and supplier-payment data exists. | Introduce supplier portal as a later milestone. |
| Mobile app | Sales team may need mobile follow-up. | Field sales and WhatsApp workflows suggest mobile usage. | Start with responsive web, then mobile app if needed. |

### Non-Functional Requirements

| Requirement | Assumption | Reason | Recommended Best Practice |
|---|---|---|---|
| High availability | CRM should be available during business hours. | It is core operations software. | Use monitored cloud deployment, backups, and health checks. |
| Auditability | Critical changes should be traceable. | Payments, bookings, and status changes require accountability. | Add audit logs for sensitive operations. |
| API resilience | Integrations should not block user workflows. | External APIs can fail. | Use async queue/outbox for critical integrations. |

### Business Rules

- Booking should normally originate from an approved quotation.
- Payment currency should follow booking/lead currency.
- India/UAE market filters should separate operational data.
- Sales consultants should not see unrelated leads/bookings unless permitted.
- Managers should see relevant country/team data.

### Constraints

- External systems may have fixed webhook payloads.
- Currency conversion depends on reliable exchange-rate data.
- Meta field names vary by campaign and form.
- Historical data may contain incomplete records.

### Assumptions

- The business operates at least India and UAE markets.
- AED and INR are primary operational currencies; USD may be used for consolidated reporting.
- Breezer CRM currently needs `booking.created` first; payment, visa, and excursion payloads may be integrated later.

---

# 4. Complete Feature Breakdown

## Authentication & Authorization

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Login | Authenticates CRM user. | As a user, I want to login securely. | Email, password | Access/session state | Required email/password, valid credentials | Only active users can login | Auth, users | Login endpoint | Users, sessions | All active users | High | Medium |
| Logout | Ends user session. | As a user, I want to logout securely. | Token/session | Success response | Valid session | Session should be invalidated | Auth | Logout endpoint | Sessions | All active users | High | Low |
| Refresh Token | Maintains secure session. | As a user, I want my session refreshed without re-login. | Refresh token | New access token | Valid refresh token | Token rotation recommended | Auth | Refresh endpoint | Sessions/tokens | All active users | High | Medium |
| RBAC | Controls module access. | As admin, I want users restricted by permissions. | Role, permission | Allow/deny | Valid role/permission | Protected routes require permission | RBAC | Permission middleware | Roles, permissions | Admin, Super Admin | High | High |
| User Activation | Enables/disables access. | As admin, I want to deactivate users when needed. | User ID, active flag | Updated user | User exists | Inactive users cannot operate | Users/Auth | User update endpoint | Users | Admin, Super Admin | High | Medium |

## User Management

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create User | Creates CRM user. | As admin, I want to create users for my team. | Name, email, role, password, country/branch if applicable | User record | Unique email, valid role | Users must have role | Auth/RBAC | Create user API | Users | Admin, Super Admin | High | Medium |
| Update User | Updates profile and assignment attributes. | As admin, I want accurate user details. | User fields | Updated user | User exists | Role changes affect access | Users/RBAC | Update user API | Users | Admin, Super Admin | High | Medium |
| Assign Role | Grants permissions through role. | As admin, I want correct access levels. | User ID, role ID | Updated access | Role exists | Least privilege | RBAC | Role assignment API | User roles | Admin, Super Admin | High | Medium |
| Manager Visibility | Managers view relevant country/team data. | As manager, I want to see my market/team records. | User role/country | Scoped records | Valid manager config | Country/team scope applies | Users, leads, bookings | List APIs with context | Users, leads | Manager, Admin | High | High |

## Lead Management

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Manual Lead Creation | Creates lead manually. | As sales/admin, I want to enter walk-in or referral leads. | Customer, contact, destination, travel info | Lead | Required contact/name depending rules | Lead code generated | Leads | Create lead API | Leads, customers optional | Sales, Manager, Admin | High | Medium |
| Meta Lead Creation | Creates leads from Meta webhook. | As marketing, I want Meta leads in CRM automatically. | Meta webhook payload | Lead | Valid Meta payload | Rules map source/country/currency/destination | MetaWebhook, Leads | Webhook endpoint | Leads, dynamic fields | System/Admin | High | High |
| Lead Assignment | Assigns lead to consultant/manager. | As manager, I want leads assigned fairly. | Lead ID, user ID or auto-rule | Assigned lead | User eligible | Role and market scope apply | Leads, Users | Assignment API | Leads | Manager, Admin | High | High |
| Status Transition | Updates lead pipeline status. | As consultant, I want to record current lead stage. | Status, notes, follow-up type | Updated lead/history | Valid status | Follow-up compliance may update | Leads | Status API | Leads, lead activities | Sales, Manager | High | Medium |
| Follow-Up Compliance | Tracks calls/WhatsApp/final reminders. | As manager, I want follow-up discipline visible. | Activity type, notes, time | Compliance counters/history | Valid activity | Cadence limits apply | Leads | Activity/status APIs | Lead activities | Sales, Manager | High | High |
| SLA Tracking | Tracks response deadline and breach. | As manager, I want SLA visibility. | Lead timestamps | SLA status | Valid dates | Breach if response missed | Leads/Automation | List/stats APIs | Leads | Manager, Admin | Medium | Medium |
| Lead Filters | Search/filter lead list. | As user, I want to find leads quickly. | Search, status, date, country, destination, consultant | Filtered list | Valid filters | Visibility scope applies | Leads | List API | Leads | All permitted roles | High | Medium |
| Lead Export | Exports filtered leads. | As manager, I want filtered lead exports. | Filters | CSV/export | Permission required | Export respects visibility | Leads | Export API | No new entity | Manager, Admin | Medium | Medium |

## Meta Configuration

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Facebook Page Setup | Stores Meta page and token config. | As admin, I want to connect Meta Lead Ads. | Page ID, token/config | Connection record | Valid token/config | Secrets protected | Meta API | Config APIs | Meta config tables | Admin, Super Admin | High | High |
| Lead Rules | Maps page/form/campaign/ad to CRM defaults. | As marketing/admin, I want leads categorized correctly. | Rule scope, country, currency, source, destination | Rule | Unique scope where required | Priority order applies | MetaWebhook | Mapping APIs | Lead mapping tables | Admin, Super Admin | High | High |
| Dynamic Field Mapping | Maps Meta questions to CRM fields. | As admin, I want form fields captured. | Question key, CRM field | Mapping | Valid field | Unknown fields kept dynamic | MetaWebhook | Mapping APIs | Dynamic JSON fields | Admin | High | Medium |

## Quotations

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Quotation | Builds quotation for lead. | As consultant, I want to create quote for customer. | Lead, destination, services, pricing | Quotation | Lead required | Pricing snapshot stored | Leads, currency | Quotation create API | Quotations, items | Sales, Manager | High | High |
| Edit Quotation | Updates draft quotation. | As consultant, I want to adjust quote before approval. | Quote fields | Updated quote | Quote exists | Locked/sent quotes may restrict edits | Quotations | Update API | Quotations | Sales, Manager | High | High |
| Send Quotation | Marks quote sent and optionally generates PDF. | As consultant, I want to send quote to customer. | Quote ID | Sent state/PDF | Quote valid | Sent timestamp tracked | PDF/email/WhatsApp | Send API | Quotations | Sales, Manager | High | Medium |
| Approve Quotation | Approves quote for conversion. | As manager/admin, I want to approve valid quotes. | Quote ID | Approved quote | Permission required | Only approved quote can create booking | Quotations | Approve API | Quotations | Manager, Admin | High | Medium |
| PDF Download | Downloads quotation PDF. | As user, I want customer-ready PDF. | Quote ID | PDF | Quote exists | PDF should match preview | PDF service | Download API | PDF URL optional | Sales, Manager | Medium | Medium |
| Pricing Calculation | Handles markup, service charge, GST/TCS. | As user, I want correct sale value. | Cost, markup, taxes, fees | Total sale value | Numeric validation | Currency/tax rules apply | Currency | Quotation APIs | Pricing snapshot | Sales, Manager | High | High |

## Bookings

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Booking | Creates booking from approved quotation. | As consultant/manager, I want to confirm customer trip. | Quotation ID, dates, amount, cost | Booking | Approved quotation required | Booking number generated | Quotations, leads | Booking create API | Bookings | Sales, Manager, Admin | High | High |
| Booking Approval | Approves booking operationally. | As manager, I want to approve booking. | Booking ID | Approved booking | Permission required | Status/payment rules may apply | Bookings | Approve API | Bookings/status history | Manager, Admin | High | Medium |
| Booking Status | Tracks pending/confirmed/cancelled/completed. | As operations, I want current booking state. | Status, reason | Updated booking | Valid transition | Cancellation affects payments/reports | Bookings | Status API | Booking history | Operations, Manager | High | Medium |
| Market View | Filters bookings by India/UAE/all markets. | As manager, I want market-specific bookings. | Market filter | Filtered list/stats | Valid market | Lead country drives market | Leads, bookings | List/stats APIs | No new entity | Manager, Admin | High | Medium |
| Breezer Webhook | Sends booking.created to Breezer CRM. | As business, I want bookings synced externally. | Booking created event | Webhook payload | URL/key configured | Non-blocking external call | BreezerIntegration | Webhook sender/test API | Logs recommended | Admin/System | High | Medium |

## Payments

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Payment | Records booking payment. | As finance user, I want to add payment. | Booking, amount, mode, date, status | Payment | Amount > 0, booking exists | Currency follows booking/lead | Bookings, currency | Payment create API | Payments, booking status | Finance, Admin | High | High |
| Edit Payment | Updates payment details/status. | As finance, I want to correct payment records. | Payment fields | Updated payment | Payment exists | Audit recommended | Payments | Update API | Payments | Finance, Admin | High | Medium |
| Proof Upload | Stores payment proof/invoice. | As finance, I want attachments stored. | File | URL | File type/size | Secure storage | S3/storage | Upload API | Payment URL fields | Finance | Medium | Medium |
| Payment Stats | Shows collected/outstanding/overdue/refunds. | As manager, I want finance summary. | Filters, currency | Stats | Valid filters/currency | Converted values shown correctly | Currency | Stats API | Payments/bookings/refunds | Manager, Finance | High | High |

## Refunds

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Refund | Records refund against booking/payment. | As finance, I want to process refunds. | Booking/payment, amount, reason | Refund | Amount valid | Refund should not exceed paid amount assumption | Payments/bookings | Refund create API | Refunds | Finance, Admin | High | Medium |
| Refund Status | Tracks pending/processed/failed. | As finance, I want refund lifecycle. | Status | Updated refund | Valid status | Processed refunds affect reports | Refunds | Update API | Refunds | Finance, Admin | Medium | Medium |
| Refund Reporting | Reports refund amount/count. | As manager, I want refund visibility. | Date/market filters | Report | Valid filters | Currency rules apply | Reports/currency | Report APIs | No new entity | Manager, Finance | Medium | Medium |

## Suppliers

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Supplier | Adds travel vendor/supplier. | As operations, I want supplier records. | Name, contact, currency, bank/payment details | Supplier | Name required, valid email/currency | Active supplier usable in quotation/booking | Suppliers | Create API | Suppliers | Operations, Admin | Medium | Medium |
| Edit Supplier | Updates supplier profile. | As operations, I want accurate supplier data. | Supplier fields | Updated supplier | Supplier exists | Payment terms affect payables | Suppliers | Update API | Suppliers | Operations, Admin | Medium | Medium |
| Supplier Terms | Captures deadlines and terms. | As finance, I want supplier payment planning. | Terms, deadlines | Terms stored | Valid dates | Deadlines can trigger risk alerts | Suppliers/bookings | Supplier APIs | Suppliers/payables assumption | Finance, Operations | Medium | High |

## Customers

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Customer Creation From Lead | Creates/links customer from lead. | As user, I want lead customer history retained. | Lead contact data | Customer/linked lead | Unique contact recommended | Duplicate handling required | Leads/customers | Customer APIs | Customers, leads | Sales, Manager | Medium | Medium |
| Customer Profile | Shows customer details and history. | As user, I want complete customer view. | Customer ID | Profile | Customer exists | Visibility rules apply | Customers/bookings | Detail API | Customers | Sales, Manager | Medium | Medium |

## Campaigns

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Campaign Management | Manages marketing campaigns. | As marketing, I want campaigns tracked. | Campaign name/date/source | Campaign | Valid date range | Campaign source links to leads | Campaigns/leads | Campaign APIs | Campaigns | Marketing, Admin | Medium | Medium |
| Campaign Reporting | Reports lead source performance. | As manager, I want marketing visibility. | Filters | Report | Valid filters | Lead source/campaign drives output | Reports | Report APIs | No new entity | Manager, Marketing | Medium | Medium |

## Reports

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Executive KPIs | Shows high-level business performance. | As leadership, I want summary KPIs. | Date, market, currency | KPI cards/table | Valid filters | Currency conversion applies | Reports/currency | Reports APIs | No new entity | Manager, Admin | High | High |
| Booking Performance | Shows booking counts/value/profit. | As manager, I want booking performance. | Date/market filters | Report | Valid dates | Lead currency/market rules apply | Bookings/currency | Report API | No new entity | Manager, Admin | High | High |
| People Performance | Shows consultant metrics. | As manager, I want team performance. | Date/user filters | Report | Valid user/date | Visibility scope applies | Leads/bookings/payments | Report API | No new entity | Manager, Admin | High | High |
| Revenue Reports | Shows revenue by month/service/destination. | As leadership, I want revenue breakdown. | Date/market/currency | Report | Valid filters | Avoid mixing currencies without conversion | Currency/bookings | Report APIs | No new entity | Manager, Admin | High | High |

## Dashboard

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KPI Cards | Shows total leads, revenue, follow-ups, bookings. | As user, I want quick business snapshot. | Market/date | KPI data | Valid filters | Market scope applies | Dashboard/reports | Dashboard API | No new entity | Admin, Manager | High | Medium |
| Revenue Graph | Shows revenue trend. | As manager, I want trend visibility. | Range/date/market/currency | Graph points | Valid range | Use same logic as KPI revenue where required | Dashboard/reports | Revenue API | No new entity | Admin, Manager | High | High |
| Lead Source Graph | Shows channel distribution. | As manager, I want source split. | Date/market | Chart | Valid filters | Source values normalized | Leads | Dashboard API | No new entity | Admin, Manager | Medium | Medium |

## Notifications

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| System Notifications | Captures important events. | As user, I want to see pending actions. | Domain event | Notification | Valid event | Avoid notification spam | Notifications/event bus | Notification API | Notifications | All permitted users | Medium | Medium |
| Read/Unread State | Tracks notification status. | As user, I want to mark read. | Notification ID | Updated state | Notification exists | User-specific status | Notifications | Update API | Notifications | All permitted users | Medium | Low |

## Integrations

| Feature | Description | User Story | Inputs | Outputs | Validation Rules | Business Rules | Dependencies | API Requirements | Database Impact | Roles Allowed | Priority | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Meta Lead Ads | Imports Facebook/Instagram lead forms. | As marketing, I want leads auto-created. | Webhook payload | Lead | Verify payload/token | Mapping rules apply | Meta API | Webhook endpoint | Leads, mappings | System/Admin | High | High |
| WhatsApp | Supports WhatsApp communication flows. | As consultant, I want customer communication support. | Message/config/event | Notification/message | Valid channel | Templates/channel config apply | WhatsApp API | WhatsApp APIs/webhook | Messages/config assumption | Sales, Admin | Medium | High |
| Breezer Webhook | Sends booking.created payload to Breezer. | As business, I want external CRM booking entry. | Booking event | HTTP POST | URL/API key configured | Non-blocking, idempotent recommended | Breezer endpoint | Outbound POST/test API | Delivery logs recommended | System/Admin | High | Medium |
| Currency API | Provides conversion rates. | As finance, I want values converted correctly. | Currency pair/date | Rate/converted value | Supported currency | Store/cache rates | Currency service | Currency APIs | Currency rates | System/Admin | High | Medium |

---

# 5. Milestone Planning

| Milestone | Name | Modules Included | Estimated Deliverables | Business Value | Technical Outcome | Sprint Mapping |
|---|---|---|---|---|---|---|
| 1 | Foundation | Auth, RBAC, users, layout, database baseline | Login, roles, permissions, protected routes | Secure team access | Stable app foundation | Sprint 1-2 |
| 2 | Lead Pipeline | Leads, assignment, follow-ups, list/detail | Manual leads, assignment, filters, status updates | Faster sales workflow | Lead APIs/UI complete | Sprint 3-4 |
| 3 | Meta Lead Automation | Meta webhook, Meta config, mapping rules | Page/rule setup, dynamic fields, auto lead creation | Reduces manual data entry | Inbound lead automation | Sprint 5 |
| 4 | Quotation Engine | Quotations, templates, PDF, pricing | Create/edit/send/approve quotations | Improves conversion workflow | Quote lifecycle and pricing snapshot | Sprint 6-7 |
| 5 | Booking Operations | Bookings, approvals, status, market filters | Create booking, update status, India/UAE views | Centralized operations | Booking lifecycle APIs/UI | Sprint 8 |
| 6 | Finance Operations | Payments, refunds, currency, finance stats | Payment/refund tracking, outstanding stats | Better cash visibility | Payment/refund modules complete | Sprint 9 |
| 7 | Business Reporting | Dashboard, reports, exports | Executive KPIs, people/booking/revenue reports | Management decision support | Report APIs and frontend views | Sprint 10 |
| 8 | Integrations | WhatsApp, Breezer, email/push, website enquiries | External lead/booking communication flows | Cross-system automation | Integration module stability | Sprint 11 |
| 9 | Production Hardening | Audit logs, monitoring, tests, performance | Production readiness checklist | Lower production risk | Observability and QA baseline | Sprint 12 |

---

# 6. Stakeholder Analysis

| Stakeholder | Type | Description | Responsibilities | Permissions | Decision Making Power | Access Level | Reports To | Interacts With |
|---|---|---|---|---|---|---|---|---|
| Super Admin | Primary | Full system owner. | Configure system, manage users, view all data. | Full access | High | Global | Platform Owner | All roles |
| Platform Owner | Primary | Business owner. | Own business decisions and roadmap. | Reports/admin access | High | Executive | N/A | Super Admin, PM |
| Company Admin | Primary | Admin for company operations. | Manage users, settings, reports. | Admin permissions | High | Company-wide | Platform Owner | Managers |
| Operations Manager | Primary | Oversees bookings and fulfillment. | Booking status, suppliers, complaints. | Booking/supplier/complaint access | Medium | Market/team | Company Admin | Sales, Finance |
| Sales Manager | Primary | Manages sales team. | Assignment, follow-up compliance, reports. | Leads/quotations/reports | Medium | Team/market | Company Admin | Sales Consultants |
| Marketing Manager | Secondary | Manages campaigns and Meta rules. | Campaign tracking, Meta config. | Campaign/meta access | Medium | Marketing | Company Admin | Sales Manager |
| Finance Manager | Primary | Manages payments/refunds. | Payment, refund, finance reports. | Finance access | Medium | Finance | Company Admin | Operations |
| Sales Consultant | Primary | Handles assigned leads and quotations. | Follow-up, qualification, quote creation. | Assigned records | Low | Own records | Sales Manager | Customers |
| Visa Consultant | Primary | Handles visa leads/cases. | Visa qualification/cases. | Visa records | Low | Assigned/market | Manager | Customers |
| Customer Support | Secondary | Handles issues and complaints. | Complaint handling, customer support. | Complaint/customer access | Low | Assigned records | Operations Manager | Customers |
| Customer Success | Secondary | Ensures customer satisfaction. | Follow-up after sale/travel. | Customer/booking read | Low | Customer scope | Operations Manager | Customers |
| HR | Secondary | Internal user administration. | Staff onboarding/offboarding assumption. | User profile access assumption | Low | Internal | Company Admin | Admin |
| Product Manager | Secondary | Product planning. | Requirements, roadmap, acceptance criteria. | Read/report access assumption | Medium | Product | Platform Owner | Dev/QA/Business |
| Developer | Secondary | Builds system. | Implementation and maintenance. | Dev/staging access | Low | Technical | Tech Lead | QA/DevOps |
| QA | Secondary | Tests product. | Test cases, regression, validation. | Test/staging access | Low | Technical | PM/Tech Lead | Developers |
| DevOps | Secondary | Manages deployment. | CI/CD, infra, monitoring, backup. | Infra access | Medium | Technical | Tech Lead | Developers |
| Security Admin | Secondary | Manages security posture. | Access reviews, audit, policies. | Security settings/reports | Medium | Security | Platform Owner | Admin/DevOps |
| Data Analyst | Secondary | Analyzes business data. | Reports and BI insights. | Reports/export access | Low | Analytics | Management | Managers |
| Business Analyst | Secondary | Bridges business and tech. | Requirements and process mapping. | Documentation/report access | Low | Product | PM | Stakeholders |
| Vendors / Suppliers | External | Service providers. | Fulfillment and supplier services. | Supplier portal assumption | Low | External | Operations | Operations/Finance |
| Partners | External | Integrated partners. | External data exchange. | Integration-specific | Low | External | Business Owner | CRM/API |
| Customers | External | End customers. | Provide inquiry/payment/travel details. | Customer portal assumption | Low | Own data | N/A | Sales/Support |
| Guests | External | Anonymous/public users. | Submit inquiry forms. | Public forms only | None | Public | N/A | Website |
| External APIs | External | Meta, WhatsApp, currency, payment APIs. | Data exchange. | API-specific | None | System | N/A | Backend |
| Payment Gateway | External | Processes online payments. | Payment authorization/capture assumption. | API-specific | None | External | Finance | Backend |
| Notification Services | External | Email/SMS/WhatsApp/push. | Deliver messages. | API-specific | None | External | System | Backend |
| CRM Integrations | External | Breezer/partner CRMs. | Receive synchronized records. | Integration-specific | None | External | Business | Backend |

---

# 7. Permission Matrix

| Stakeholder | Can View | Can Create | Can Update | Can Delete | Can Approve | Can Export | Can Configure | Can Manage Users | Can Access Reports | Can Access Billing | Can Access Settings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Super Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Limited | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Manager | Team/market | Yes | Yes | No | Yes | Yes | Limited | Limited | Yes | Limited | Limited |
| Sales Consultant | Assigned only | Leads/quotes | Assigned only | No | No | Limited | No | No | Limited | No | No |
| Visa Consultant | Assigned visa records | Visa records | Assigned visa records | No | No | Limited | No | No | Limited | No | No |
| Finance User | Finance/booking data | Payments/refunds | Payments/refunds | No | Limited | Yes | No | No | Finance reports | Yes | No |
| Operations User | Bookings/suppliers/complaints | Operational records | Operational records | No | Limited | Limited | No | No | Operational reports | Limited | No |
| Marketing User | Campaign/meta data | Campaigns/rules | Campaigns/rules | No | No | Yes | Meta config limited | No | Marketing reports | No | No |
| Customer Support | Customers/complaints | Complaints | Complaints | No | No | No | No | No | Limited | No | No |
| Data Analyst | Reports | No | No | No | No | Yes | No | No | Yes | No | No |
| External CRM | Integration payload only | System-created | System-created | No | No | No | No | No | No | No | No |
| Customer | Own portal data assumption | Inquiry/payment assumption | Own profile assumption | No | No | No | No | No | No | Payment self-service assumption | No |
| Supplier | Own supplier data assumption | Service updates assumption | Service updates assumption | No | No | No | No | No | No | No | No |

---

# 8. Business Workflow

## Customer Journey

```text
Customer submits inquiry
  -> CRM lead is created
  -> Consultant contacts customer
  -> Requirements are qualified
  -> Quotation is prepared
  -> Customer accepts quotation
  -> Booking is created
  -> Payment is collected
  -> Travel/service delivery happens
  -> Support/refund/complaint handled if needed
```

## Admin Journey

```text
Admin logs in
  -> Configures users, roles, countries, Meta rules, settings
  -> Monitors dashboard and reports
  -> Reviews assignments and exceptions
  -> Exports data where needed
```

## Internal Operations

```text
Booking confirmed
  -> Operations reviews service details
  -> Supplier/service details managed
  -> Deadlines and risks monitored
  -> Booking status updated
  -> Customer support handles issues if raised
```

## Support Workflow

```text
Customer issue raised
  -> Complaint created
  -> Assigned to support/operations
  -> Investigation and status update
  -> Resolution recorded
  -> Management can report complaint trends
```

## Notification Workflow

```text
Domain event occurs
  -> Notification service captures event
  -> Notification appears for relevant user
  -> User marks read or acts on it
```

## Payment Workflow

```text
Booking created
  -> Payment due/outstanding calculated
  -> Finance creates payment
  -> Payment status updates booking/payment summary
  -> Refund created if required
  -> Finance reports reflect amount and currency
```

## Approval Workflow

```text
Quotation or booking needs approval
  -> Authorized manager/admin reviews details
  -> Approves or rejects/updates
  -> Approved record becomes eligible for next workflow step
```

## Integration Workflow

```text
Booking created in Get2Vacations CRM
  -> bookings.created event emitted
  -> Breezer booking.created payload built
  -> Backend sends POST to Breezer webhook URL
  -> Breezer creates/updates booking entry
```

Assumption:

- Future production integration should use durable outbox/retry for all critical external webhook deliveries. Reason: external CRM downtime should not lose events. Recommended best practice: store outbound events and retry asynchronously.

---

# 9. Functional Requirements

| ID | Requirement | Module | Priority |
|---|---|---|---|
| FR-001 | User must be able to login securely. | Auth | High |
| FR-002 | User must be able to logout. | Auth | High |
| FR-003 | System must enforce role-based access control. | RBAC | High |
| FR-004 | Admin must be able to create and manage users. | Users | High |
| FR-005 | Admin must be able to activate/deactivate users. | Users/Auth | High |
| FR-006 | System must support manual lead creation. | Leads | High |
| FR-007 | System must support Meta Lead Ads lead creation. | MetaWebhook/Leads | High |
| FR-008 | System must support lead assignment to eligible users. | Leads/Users | High |
| FR-009 | Sales consultants must see assigned leads based on visibility rules. | Leads | High |
| FR-010 | Managers must see relevant team/market leads. | Leads | High |
| FR-011 | Users must be able to update lead status and notes. | Leads | High |
| FR-012 | System must track follow-up history. | Leads | High |
| FR-013 | System must track follow-up compliance. | Leads | High |
| FR-014 | System must track SLA status and breach indicator. | Leads | Medium |
| FR-015 | Admin must configure Meta lead rules. | Meta Configuration | High |
| FR-016 | Meta rules must map source label, country, currency, lead type, and destination where configured. | Meta Configuration | High |
| FR-017 | User must be able to create quotations for leads. | Quotations | High |
| FR-018 | User must be able to edit draft quotations. | Quotations | High |
| FR-019 | User must be able to send quotations. | Quotations | High |
| FR-020 | Authorized user must be able to approve quotations. | Quotations | High |
| FR-021 | System must generate/download quotation PDFs. | Quotations | Medium |
| FR-022 | System must calculate quotation sale value using cost, markup, service fees, and tax fields. | Quotations | High |
| FR-023 | User must be able to create booking from approved quotation. | Bookings | High |
| FR-024 | Authorized user must be able to approve booking. | Bookings | High |
| FR-025 | User must be able to filter bookings by market, status, payment, destination, consultant, and date. | Bookings | High |
| FR-026 | Booking stats must update based on filters. | Bookings | High |
| FR-027 | System must send booking.created webhook to Breezer when enabled. | Breezer Integration | High |
| FR-028 | Finance user must create booking payments. | Payments | High |
| FR-029 | Payment currency must be derived from booking/lead currency where applicable. | Payments | High |
| FR-030 | User must be able to update payment status. | Payments | High |
| FR-031 | User must be able to upload payment proof/invoice attachments. | Payments | Medium |
| FR-032 | Finance user must create refunds. | Refunds | High |
| FR-033 | System must report refund amount and count. | Refunds/Reports | Medium |
| FR-034 | User must manage suppliers. | Suppliers | Medium |
| FR-035 | User must manage customers and view customer history. | Customers | Medium |
| FR-036 | User must manage campaigns and track lead source. | Campaigns | Medium |
| FR-037 | Dashboard must show total leads, revenue, open follow-ups, and bookings. | Dashboard | High |
| FR-038 | Reports must show executive KPIs, booking performance, people performance, and revenue breakdowns. | Reports | High |
| FR-039 | System must support India/UAE/all-market report and booking views. | Reports/Bookings | High |
| FR-040 | System must support multi-currency reporting and conversion. | Currency/Reports | High |
| FR-041 | System must show notifications for important domain events. | Notifications | Medium |
| FR-042 | System must support WhatsApp-related communication/configuration flows. | WhatsApp | Medium |
| FR-043 | System must support complaints management. | Complaints | Medium |
| FR-044 | System must support visa cases. | Visa | Medium |
| FR-045 | System must support package and destination management. | Packages/Destinations | Medium |

---

# 10. Non-Functional Requirements

| ID | Category | Requirement | Priority |
|---|---|---|---|
| NFR-001 | Security | Protected APIs must require authentication and authorization. | High |
| NFR-002 | Security | Secrets must be stored in environment variables or secure secret manager. | High |
| NFR-003 | Security | Sensitive operations should be audited. | High |
| NFR-004 | Performance | Common list APIs should support pagination, search, filters, and indexed queries. | High |
| NFR-005 | Performance | Database pool size must be controlled to avoid too many connections. | High |
| NFR-006 | Scalability | Integration calls should be asynchronous where business-critical. | Medium |
| NFR-007 | Availability | Health checks should exist for backend and database dependencies. | High |
| NFR-008 | Reliability | Failed external API calls should be logged and retried where required. | Medium |
| NFR-009 | Audit Logs | User, status, booking, payment, and integration changes should be traceable. | High |
| NFR-010 | Compliance | System should protect customer personal data and restrict access by role. | High |
| NFR-011 | Backup | Database backup and restore procedures should be defined. | High |
| NFR-012 | Disaster Recovery | RPO/RTO targets should be documented before production. | Medium |
| NFR-013 | Accessibility | UI should support basic accessibility standards. | Medium |
| NFR-014 | Localization | System should support India/UAE date, currency, and timezone expectations. | Medium |
| NFR-015 | Browser Support | CRM should support modern Chrome, Edge, Firefox, and Safari. | Medium |
| NFR-016 | Mobile Responsiveness | Key pages should work on tablet and mobile screens. | Medium |
| NFR-017 | Error Handling | API errors should return consistent error shape without exposing stack traces in production. | High |
| NFR-018 | Observability | Structured logs and request IDs should be available. | High |
| NFR-019 | Monitoring | Production should monitor API latency, error rate, database health, and webhook failures. | High |
| NFR-020 | API Rate Limiting | Public and integration endpoints should use rate limiting where applicable. | Medium |

---

# 11. Suggested Database Modules

High-level entity list only:

- Users
- Roles
- Permissions
- User Roles
- Sessions / Tokens
- Leads
- Lead Activities
- Lead Follow-Ups
- Lead Assignment History
- Lead Custom Status Presets
- Customers
- Countries
- Destinations
- Campaigns
- Meta Page Configurations
- Meta Lead Mapping Rules
- Meta Dynamic Fields
- Quotations
- Quotation Items
- Quotation Templates
- Bookings
- Booking Status History
- Payments
- Refunds
- Suppliers
- Supplier Payables
- Supplier Settlements
- Visa Cases
- Packages
- Complaints
- Notifications
- WhatsApp Channels / Messages assumption
- Website Enquiries
- Currency Rates
- Reports / Report Snapshots assumption
- Webhook Logs
- Breezer Integration Delivery Logs recommendation
- Audit Logs
- Files / Attachments
- Settings

---

# 12. Integrations

| Integration | Purpose | Direction | Authentication Method | Payload Summary | Retry Requirement | Error Handling Requirement |
|---|---|---|---|---|---|---|
| Meta Lead Ads | Import Facebook/Instagram lead forms into CRM. | Inbound | Verify token/app secret/token config | Lead form data, campaign/ad/form IDs, field data | Recommended for failed processing | Log failed lead and preserve safe raw payload |
| WhatsApp | Customer communication and reminders. | Inbound/Outbound | WhatsApp/Meta token and webhook verification | Messages, templates, lead/booking reminders | Required for outbound messages | Log API status and message errors |
| Breezer CRM | Send booking-created data to client CRM. | Outbound | `x-api-key` header | `booking.created` payload with booking object and empty service arrays currently | Recommended durable retry/outbox | Log response, status, body, and failed delivery |
| Currency API | Fetch and cache exchange rates. | Outbound | API key if external provider used | Currency rates and conversion values | Cache fallback recommended | Use cached/mock rates if API fails |
| Email | Send system or customer emails. | Outbound | SMTP/API key assumption | Email recipient, subject, body, attachments | Retry recommended | Log send failure |
| Push Notifications | Browser push/system notifications. | Outbound | VAPID keys assumption | Notification title/body/link | Retry optional | Log delivery errors |
| Website Enquiries | Accept leads/enquiries from public websites. | Inbound | Public endpoint with anti-spam/rate limit recommended | Customer inquiry form payload | Not applicable | Validate and deduplicate |
| Payment Gateway | Online payment collection. | Outbound/Inbound | Gateway API key/webhook signature | Payment intent/status/webhook | Required | Verify signature and reconcile payment |
| Analytics | Track marketing/product usage. | Outbound | API key/tag assumption | Event/page analytics | Optional | Avoid blocking user flow |
| AI Services | Future AI lead scoring/quote support. | Outbound | API key | Lead/quote context | Optional | Protect sensitive data |
| Google Maps | Destination/address assistance. | Outbound | API key | Places/geocoding | Optional | Graceful fallback |
| Calendar | Follow-up/travel reminders. | Outbound | OAuth/API key assumption | Event/reminder data | Optional | Log sync issues |
| Social Login | Optional login method. | Inbound/Outbound | OAuth | Profile/token | Optional | Enforce account linking rules |

---

# 13. Competitor Analysis

Assumption:

- Direct competitor research was not available in the provided codebase. The following are industry examples relevant to travel CRM, tour operators, and travel agency operations.

| Competitor | Website | Strengths | Weaknesses | Features Worth Considering |
|---|---|---|---|---|
| Zoho CRM | https://www.zoho.com/crm/ | Mature CRM, automation, reporting, integrations | Generic, travel-specific customization needed | Workflow automation, pipeline reporting |
| HubSpot CRM | https://www.hubspot.com/products/crm | Strong marketing/sales CRM, UX, automation | Costly at scale, not travel-specific | Lead nurturing, email automation, dashboards |
| TravelWorks | https://travelworks.co.uk/ | Travel accounting and back-office focus | May not fit custom sales workflows | Travel accounting workflows |
| Tourwriter | https://www.tourwriter.com/ | Tour itinerary and quote management | Less general CRM functionality | Itinerary/quote building ideas |
| Travefy | https://travefy.com/ | Itinerary builder, client-facing documents | Not full operational CRM | Customer itinerary experience |
| Salesforce | https://www.salesforce.com/ | Enterprise extensibility and reporting | Expensive and complex | Advanced automation, role hierarchy, analytics |

---

# 14. Risks & Challenges

| Risk | Category | Impact | Probability | Mitigation Strategy |
|---|---|---|---|---|
| Meta field names vary by campaign/form. | Data Quality | Incorrect lead mapping. | High | Use dynamic field storage and configurable rules. |
| Duplicate leads from Meta or manual entry. | Data Quality | Sales confusion and duplicate follow-up. | Medium | Deduplicate by phone/email/meta lead ID. |
| Currency conversion errors. | Finance | Incorrect revenue/profit reporting. | High | Freeze transaction currency, store rates, test conversion. |
| Too many database connections. | Technical | API failures and downtime. | Medium | Limit pool size, monitor DB connections, avoid process duplication. |
| External webhook failure. | Integration | Booking not created in client CRM. | Medium | Add outbox, retries, delivery log, manual retry. |
| Role visibility bugs. | Security/Business | Users see wrong market/team data. | Medium | Add RBAC and visibility tests. |
| Incomplete historical data. | Operational | Reports show wrong totals. | Medium | Add data cleanup scripts and missing-data flags. |
| PDF mismatch between preview and download. | Operational | Client-facing quality issue. | Low/Medium | Use one rendering source and PDF regression checks. |
| Notification spam. | Operational | Users ignore important notifications. | Medium | Configure notification categories and reduce auth noise. |
| Weak audit trail. | Security | Hard to investigate changes. | Medium | Add audit logs for payments, bookings, role changes, integrations. |
| Public webhook abuse. | Security | Spam or malicious data. | Medium | Verify signatures/tokens, rate limit, validate payloads. |
| Report performance degradation. | Technical | Slow dashboard/reports. | Medium | Add indexes, aggregation, pagination, caching. |

---

# 15. Future Enhancements

| Enhancement | Description | Business Value |
|---|---|---|
| AI Lead Scoring | Score leads based on source, budget, urgency, behavior. | Helps sales prioritize high-conversion leads. |
| AI Quotation Builder | Generate quote drafts from lead requirements. | Reduces quote creation time. |
| Automated Follow-Up Assistant | Suggest next message/follow-up actions. | Improves response consistency. |
| Customer Portal | Customers view quotations, bookings, payments, documents. | Reduces support load. |
| Supplier Portal | Suppliers update service confirmations and invoices. | Improves operations coordination. |
| Mobile App | Mobile access for consultants and managers. | Better field productivity. |
| Advanced BI Dashboard | Deeper revenue, conversion, campaign, market analytics. | Better decision making. |
| Revenue Forecasting | Predict revenue from pipeline and quotes. | Helps management planning. |
| Dynamic Package Pricing | Update package pricing based on supplier/currency rules. | Better margin control. |
| WhatsApp Chatbot | Automate FAQs and lead qualification. | Faster customer response. |
| AI Document Parser | Extract details from passports, invoices, receipts. | Reduces manual entry. |
| Multi-Branch Accounting | Branch-wise finance and reporting. | Supports scale across countries. |
| Multi-Tenant SaaS Support | Serve multiple travel companies from one platform. | Enables SaaS business model. |
| Durable Integration Outbox | Guaranteed webhook delivery to partner systems. | Reduces integration data loss. |
| Audit Trail Module | Track who changed what and when. | Improves accountability and compliance. |

---

# Confirmed Features, Assumptions, And Recommendations

## Confirmed Features

- Backend contains modules for auth, RBAC, users, leads, Meta webhook, quotations, bookings, payments, refunds, suppliers, reports, dashboard, notifications, WhatsApp, currency, campaigns, customers, complaints, visa, webhooks, website enquiries, and Breezer integration.
- Frontend contains routes/pages for dashboard, leads, quotations, bookings, payments, refunds, reports, Meta configuration, customers, suppliers, campaigns, notifications, users, visa, complaints, packages, and destinations.
- The system supports role/permission-protected frontend routes.
- The system includes India/UAE market concepts and multi-currency operations.
- Breezer integration currently focuses on booking-created webhook payload.

## Assumptions

| Assumption | Reason | Recommended Best Practice |
|---|---|---|
| Customer portal is future scope. | No confirmed customer-facing CRM portal route was identified. | Implement after internal operations stabilize. |
| Supplier portal is future scope. | Supplier management exists, but external supplier access is not confirmed. | Add supplier portal only after supplier workflows are finalized. |
| Payment gateway integration is possible future scope. | Payments exist, but gateway contract is not confirmed in this document. | Define gateway contract, webhooks, reconciliation, and refunds before implementation. |
| Durable webhook outbox should be added for critical integrations. | Current direct webhook delivery can fail if external endpoint is unavailable. | Store outbound events and support retry/manual replay. |
| Audit logs should be expanded. | Sensitive changes exist across users, bookings, payments, refunds. | Add audit events for critical state changes. |

## Recommendations

- Add automated integration tests for role visibility, market filters, currency conversion, booking stats, payment stats, and Breezer payload mapping.
- Add production monitoring for database connections, API latency, report query time, and webhook failures.
- Add data quality checks for incomplete lead currency, country, destination, and assignment fields.
- Establish clear ownership for India/UAE market logic and reporting currency rules.
- Maintain integration documentation for Meta, WhatsApp, Breezer, website enquiries, and currency providers.
