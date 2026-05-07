# Get2Vacation Travel CRM

Enterprise-grade Customer Relationship Management system for tour and travel companies. Built as a **modular monolith** with feature-based architecture, clean layering, and dependency injection throughout.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Backend Modules](#backend-modules)
9. [API Reference](#api-reference)
10. [Role-Based Access Control](#role-based-access-control)
11. [Lead Assignment Logic](#lead-assignment-logic)
12. [Real-time & Events](#real-time--events)
13. [Frontend Structure](#frontend-structure)
14. [Deployment](#deployment)
15. [Scripts Reference](#scripts-reference)
16. [Troubleshooting](#troubleshooting)

---

## Overview

Get2Vacation Travel CRM automates the complete travel sales lifecycle — from lead capture to post-booking operations. It eliminates lead leakage, enforces 15-minute SLA response compliance, and provides real-time visibility into sales performance, revenue, and team productivity.

**Core capabilities:**
- Multi-channel lead capture (Facebook, Instagram, Website, WhatsApp, Google Ads)
- Smart lead distribution with round-robin and expertise-based routing
- Quotation generation with PDF export and WhatsApp delivery
- End-to-end booking and payment tracking
- Visa case pipeline management
- WhatsApp automation sequences
- Role-based dashboards and analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                  │
│         TypeScript · Vite · Tailwind · Axios             │
└────────────────────────┬────────────────────────────────┘
                         │ REST + Socket.io
┌────────────────────────▼────────────────────────────────┐
│              Express.js Modular Monolith                 │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Routes  │→ │Controller│→ │ Service  │→ │  Repo  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───┬────┘  │
│                                                  │       │
│  ┌───────────────────────────────────────────────▼────┐  │
│  │              PostgreSQL (pg pool)                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Cross-cutting: Auth · RBAC · Logger · Events · S3      │
└─────────────────────────────────────────────────────────┘
```

**Key patterns:**
- **Module Factory Pattern** — every module exports `createXModule({ db, logger, ... })` returning a frozen object
- **Dependency Injection** — all dependencies passed explicitly via `container.js`; no globals
- **Repository Pattern** — data access fully abstracted; snake_case ↔ camelCase normalization at boundaries
- **Event-Driven** — Node.js `EventEmitter` bus for inter-module communication (mail, notifications, WhatsApp triggers)
- **RBAC** — permission checks enforced at the route level via middleware

---

## Project Structure

```
travel-crm/
├── backend/
│   ├── src/
│   │   ├── core/               # Cross-cutting infrastructure
│   │   │   ├── automation/     # Cron scheduler for automated tasks
│   │   │   ├── config/         # Environment config (env.js)
│   │   │   ├── constants/      # System-wide constants & roles
│   │   │   ├── database/       # PostgreSQL pool & query utilities
│   │   │   ├── errors/         # AppError class
│   │   │   ├── logger/         # Pino structured logger
│   │   │   ├── mail/           # Nodemailer email service
│   │   │   ├── middlewares/    # auth, validate, errorHandler, requestContext
│   │   │   ├── observability/  # Prometheus-style metrics
│   │   │   ├── realtime/       # Socket.io server & event publisher
│   │   │   ├── roles/          # RBAC roles service
│   │   │   ├── security/       # JWT token blacklist
│   │   │   ├── storage/        # AWS S3 service
│   │   │   └── utils/          # asyncHandler, pagination
│   │   ├── modules/            # Feature modules (see below)
│   │   ├── app.js              # Express app factory
│   │   ├── container.js        # Dependency injection container
│   │   ├── server.js           # HTTP server entry point
│   │   └── index.js            # Module aggregator
│   ├── database/
│   │   ├── migrations/         # SQL migration files
│   │   ├── main-db.sql         # Full schema
│   │   ├── seed-rbac.json      # Roles & permissions seed
│   │   └── seed-dummy-data.sql # Dev test data
│   ├── scripts/                # Operational scripts
│   ├── docs/                   # API contracts, specs, runbooks
│   └── postman/                # Postman collections & environments
├── frontend/
│   └── src/
│       ├── api/                # Axios API clients per module
│       ├── components/         # Shared UI components
│       ├── context/            # AuthContext, ServiceContext, NotificationsContext
│       ├── datasource/         # Data fetching layer
│       ├── hooks/              # Custom React hooks
│       ├── pages/              # Route-level page components
│       ├── services/           # Frontend business logic
│       ├── types/              # TypeScript type definitions
│       └── utils/              # Utility functions
└── docs/                       # Product docs, PRD, SOP
```

---

## Tech Stack

### Backend
| Concern | Technology |
|---|---|
| Runtime | Node.js >= 20 (ES Modules) |
| Framework | Express.js 4 |
| Database | PostgreSQL (pg 8) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Logging | Pino + pino-http |
| Real-time | Socket.io 4 |
| File uploads | Multer + AWS S3 |
| Email | Nodemailer |
| PDF | PDFKit |
| Security | Helmet, CORS, express-rate-limit |

### Frontend
| Concern | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build | Vite 7 |
| Routing | React Router DOM 7 |
| HTTP | Axios |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | react-icons |

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL 14+
- AWS S3 bucket (for file storage)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run db:migrate
npm run db:seed:rbac
npm run dev
```

Server starts on `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev
```

Dev server starts on `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=<access_key>
AWS_SECRET_ACCESS_KEY=<secret_key>
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>

# WhatsApp Cloud API
WHATSAPP_API_TOKEN=<token>
WHATSAPP_PHONE_NUMBER_ID=<phone_number_id>

# Meta Lead Ads
META_VERIFY_TOKEN=<verify_token>
META_APP_SECRET=<app_secret>

# Metrics (optional)
METRICS_ENABLED=true
METRICS_TOKEN=<token>
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Database Setup

```bash
# Run all migrations
npm run db:migrate

# Seed roles and permissions
npm run db:seed:rbac

# Seed dummy data for development
node scripts/seed-dummy-data.js

# Backup
npm run db:backup

# Restore
npm run db:restore
```

The full schema is in `database/main-db.sql`. Migrations live in `database/migrations/` and are applied in order.

**Key tables:**

| Table | Purpose |
|---|---|
| `users` | All system users with role, country, agent_type |
| `roles` | Role definitions |
| `permissions` | Permission definitions |
| `role_permissions` | Role ↔ permission mapping |
| `leads` | Lead records with full lifecycle fields |
| `lead_activities` | Activity log per lead |
| `followups` | Follow-up schedule per lead |
| `queued_leads` | Leads awaiting agent assignment |
| `lead_assignment_history` | Full assignment audit trail |
| `quotations` | Quotation records |
| `bookings` | Booking records |
| `payments` | Payment tracking |
| `visa_cases` | Visa pipeline |
| `customers` | Customer profiles |
| `destinations` | Travel destinations |
| `countries` | Country master |
| `user_countries` | Agent ↔ country mapping (multi-country) |
| `packages` | Travel packages |
| `suppliers` | Supplier directory |
| `notifications` | In-app notifications |
| `app_settings` | System configuration (timezone, locale, etc.) |

---

## Backend Modules

Every module follows the same factory pattern and lives in `src/modules/<name>/`.

```
<module>/
├── index.js              ← createXModule() factory
├── <module>.controller.js
├── <module>.service.js
├── <module>.repository.js
├── <module>.routes.js
├── <module>.validation.js
├── <module>.schema.js
└── <module>.events.js
```

### Module Inventory

| Module | Responsibility |
|---|---|
| `auth` | Login, logout, password reset, JWT refresh |
| `rbac` | Roles, permissions, resource access control |
| `users` | User CRUD, hierarchy, manager assignment |
| `leads` | Lead lifecycle, assignment, follow-ups, SLA |
| `quotations` | Quotation creation, templates, PDF generation |
| `bookings` | Booking workflow, supplier coordination |
| `payments` | Payment tracking, invoices |
| `refunds` | Refund requests and processing |
| `visa` | Visa case pipeline, document tracking |
| `customers` | Customer profiles, segmentation, history |
| `campaigns` | Marketing campaigns, lead source tracking |
| `complaints` | Customer complaints and resolution |
| `packages` | Travel package management, website publishing |
| `destinations` | Destination management |
| `suppliers` | Supplier directory |
| `countries` | Country master, agent-country assignment |
| `employees` | Employee directory, attendance, targets |
| `dashboard` | KPI analytics and summary data |
| `reports` | Reporting and data export |
| `notifications` | In-app notification system |
| `settings` | System configuration |
| `mail` | Email sending and event subscribers |
| `whatsapp` | WhatsApp Cloud API integration |
| `metaWebhook` | Facebook/Instagram Lead Ads webhook |
| `webhooks` | Generic webhook handlers |

---

## API Reference

Base URL: `http://localhost:3000`

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

All responses follow:
```json
{ "data": { ... } }
```

Errors follow:
```json
{
  "error": {
    "message": "Human-readable message",
    "code": "MACHINE_READABLE_CODE",
    "details": { ... }
  }
}
```

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Invalidate token |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset with token |
| GET | `/api/auth/me` | Current user profile |

### Leads

| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List leads (paginated, filtered) |
| POST | `/api/leads` | Create lead (auto-assigns) |
| GET | `/api/leads/:id` | Get lead by ID |
| PATCH | `/api/leads/:id` | Update lead |
| POST | `/api/leads/:id/assign` | Manually assign lead |
| POST | `/api/leads/:id/followups` | Create follow-up |
| GET | `/api/leads/:id/followups` | List follow-ups |
| POST | `/api/leads/distribute` | Bulk distribute unassigned leads |
| POST | `/api/leads/process-queued` | Retry queued leads |

**Lead query params:** `status`, `source`, `temperature`, `assignedTo`, `leadCountry`, `leadType`, `search`, `fromDate`, `toDate`, `sla`, `sortBy`, `page`, `limit`

### Quotations

| Method | Path | Description |
|---|---|---|
| GET | `/api/quotations` | List quotations |
| POST | `/api/quotations` | Create quotation |
| GET | `/api/quotations/:id` | Get quotation |
| PATCH | `/api/quotations/:id` | Update quotation |
| POST | `/api/quotations/:id/send` | Send via email/WhatsApp |
| GET | `/api/quotations/:id/pdf` | Download PDF |

### Bookings

| Method | Path | Description |
|---|---|---|
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/:id` | Get booking |
| PATCH | `/api/bookings/:id` | Update booking |
| PATCH | `/api/bookings/:id/status` | Update booking status |

### Payments

| Method | Path | Description |
|---|---|---|
| GET | `/api/payments` | List payments |
| POST | `/api/payments` | Record payment |
| GET | `/api/payments/:id` | Get payment |
| PATCH | `/api/payments/:id` | Update payment |

### Visa

| Method | Path | Description |
|---|---|---|
| GET | `/api/visa` | List visa cases |
| POST | `/api/visa` | Create visa case |
| GET | `/api/visa/:id` | Get visa case |
| PATCH | `/api/visa/:id` | Update visa case |
| PATCH | `/api/visa/:id/status` | Update pipeline status |

### Customers

| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Get customer |
| PATCH | `/api/customers/:id` | Update customer |
| GET | `/api/customers/:id/leads` | Customer's lead history |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Deactivate user |

### Dashboard & Reports

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard` | KPI summary |
| GET | `/api/dashboard/leads` | Lead analytics |
| GET | `/api/dashboard/revenue` | Revenue analytics |
| GET | `/api/reports` | Report list |
| GET | `/api/reports/:type` | Generate report |

### Health & Metrics

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Overall health |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (DB check) |
| GET | `/metrics` | Prometheus metrics (token required) |
| GET | `/metrics/json` | JSON metrics snapshot |

---

## Role-Based Access Control

### Roles

| Role | Description |
|---|---|
| `super_admin` | Full system access, no restrictions |
| `admin` | Full access, system configuration |
| `manager` | Team monitoring, lead allocation, targets |
| `sales_consultant` | Own leads, quotations, status updates |
| `visa_executive` | Visa pipeline and document management |
| `holiday_consultant` | Holiday leads and quotations |
| `accounts` | Payments, invoices, refund processing |
| `marketing` | Campaigns, packages, bulk communications |

### Access Scope by Role

**Leads visibility:**
- `super_admin` / `admin` / `accounts` — all leads
- `manager` — own leads + team members' leads + unassigned leads in their country
- `sales_consultant` / `visa_executive` / `holiday_consultant` — only own assigned leads

**Country scoping:**
- Agents are assigned to one or more countries via `user_countries` table
- Leads with a `lead_country` are only visible to agents/managers of that country
- Leads with no `lead_country` are visible to all

### Permission Check Flow

```
Request → authenticate middleware (JWT verify)
       → requirePermission(resource, action) middleware
       → rbacService.checkPermission(role, resource, action)
       → 403 if denied, next() if allowed
```

---

## Lead Assignment Logic

### Auto-Assignment on Create

When a lead is created with `autoAssign !== false` and no `assignedTo`:

1. `selectAssigneeForLead` is called with `roleName = "agent"`
2. Fetches all active, non-leave agents (`ASSIGNABLE_ROLES`)
3. If `leadCountry` is set → filters agents by matching `agent_country`
4. If `leadType` is set (VISA/HOLIDAY) → filters agents by matching `agent_type`
5. If `destinationId` is set → prefers agents with matching `expertiseDestinations`
6. Applies **round-robin** selection per country+type key (in-memory state)
7. High-value leads (VIP or budget ≥ ₹1,50,000) → assigned to agent with lowest open lead load
8. If no agent found → lead is queued in `queued_leads` with reason `NO_ASSIGNABLE_AGENT`

### Queue Processing

Queued leads are retried by the automation scheduler or manually via:
```
POST /api/leads/process-queued
```

### SLA Breach Escalation

- Response deadline = 15 minutes from lead creation
- If no `response_at` recorded within deadline → `sla_breached = true`
- Lead is escalated to a manager via `assignLead(..., { roleName: "manager" })`
- `SLA_BREACHED` event emitted → notification sent to managers

### Follow-up Compliance

Before marking a lead as `LOST` or `NON_RESPONSIVE`, the system enforces:
- Minimum 4 call follow-ups
- Minimum 2 WhatsApp follow-ups
- Minimum 1 final reminder

Leads with `callsDisabled = true` skip call requirements and allow unlimited WhatsApp.

---

## Real-time & Events

### Socket.io Rooms

Each authenticated user joins room `user:<userId>`. Notifications are broadcast to specific rooms.

### Event Bus

Internal events use Node.js `EventEmitter`. Key events:

| Event | Trigger |
|---|---|
| `leads.created` | New lead created |
| `leads.updated` | Lead updated |
| `leads.assigned` | Lead assigned to agent |
| `leads.reassigned` | Lead reassigned |
| `leads.escalated` | No agent found / SLA breach |
| `leads.sla_breached` | 15-min SLA exceeded |
| `leads.followup_created` | Follow-up scheduled |
| `leads.followup_overdue` | Follow-up past due time |
| `bookings.created` | New booking |
| `payments.created` | Payment recorded |
| `visa.status_changed` | Visa case status updated |

### Event Subscribers

- `mail.subscribers.js` — sends emails on key events
- `whatsapp.subscribers.js` — sends WhatsApp messages on key events
- `notifications.subscribers.js` — creates in-app notifications

---

## Frontend Structure

### Data Flow

```
Page Component
  → useXService() hook
    → XService (business logic)
      → XDatasource (HTTP)
        → apiClient (Axios instance with interceptors)
          → Backend REST API
```

### Key Contexts

| Context | Purpose |
|---|---|
| `AuthContext` | Current user, token, login/logout |
| `ServiceContext` | Injected service instances |
| `NotificationsContext` | Real-time notification state via Socket.io |

### Pages by Feature

| Feature | Pages |
|---|---|
| Auth | Login, ForgotPassword, ResetPassword |
| Dashboard | Dashboard |
| Leads | LeadsPage, CreateLead, LeadDetails |
| Quotations | QuotationsPage, CreateQuotation, EditQuotation, QuotationDetail, QuotationBuilder, Templates |
| Bookings | BookingsPage, BookingDetail |
| Customers | CustomersPage, CustomerDetail, NewCustomer |
| Visa | VisaCasesPage, VisaCreate, VisaDetail |
| Finance | FinanceSystem, PaymentsPage, RefundsPage |
| Reports | ReportsHubPage |
| Settings | UsersPage, DestinationsPage, SuppliersPage, PackagesPage, CampaignsPage |
| Notifications | NotificationsPage |
| Profile | ProfilePage |
| Public | PublicLeadCapturePage |

---

## Deployment

Both frontend and backend deploy to **Vercel**.

### Backend (`backend/vercel.json`)

```json
{
  "version": 2,
  "builds": [{ "src": "src/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/index.js" }]
}
```

Set all environment variables in the Vercel project dashboard.

### Frontend (`frontend/vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the deployed backend URL.

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET` (32+ chars)
- [ ] PostgreSQL SSL enabled (`ssl: { rejectUnauthorized: true }`)
- [ ] CORS origin locked to frontend domain
- [ ] `METRICS_TOKEN` set
- [ ] S3 bucket policy restricted
- [ ] SMTP credentials configured
- [ ] WhatsApp API token active

---

## Scripts Reference

Run from `backend/`:

```bash
# Development
npm run dev                   # Start with nodemon

# Database
npm run db:migrate            # Run SQL migrations
npm run db:seed:rbac          # Seed roles & permissions
node scripts/seed-dummy-data.js  # Seed test data
npm run db:backup             # Backup to file
npm run db:restore            # Restore from file

# Diagnostics
node scripts/check-db.js      # Verify DB connection
node scripts/check-schema.js  # Inspect table columns
node scripts/check-roles-users.js  # Inspect roles/users

# Sprint Tests
npm run test:sprint1          # Auth & users
npm run test:sprint2          # Leads
npm run test:sprint3          # Quotations
npm run test:sprint4          # Bookings & payments
npm run test:sprint5          # Visa
npm run test:sprint6          # Notifications & WhatsApp
npm run test:sprint7          # Reports & dashboard
npm run test:sprint8          # Production readiness
```

---

## Troubleshooting

### Leads not auto-assigning (`NO_ASSIGNABLE_AGENT`)

1. Verify agents are active and not on leave:
   ```sql
   SELECT full_name, is_active, is_on_leave, agent_country, agent_type
   FROM users u
   JOIN roles r ON r.id = u.role_id
   WHERE r.name IN ('sales_consultant', 'visa_executive', 'holiday_consultant')
     AND u.is_active = TRUE;
   ```
2. If the lead has a `lead_country`, ensure at least one agent has a matching `agent_country` in `user_countries` or `users.agent_country`.
3. If the lead has a `lead_type` of VISA or HOLIDAY, ensure agents have a matching `agent_type` (or `BOTH`).
4. Process the queue manually: `POST /api/leads/process-queued`

### JWT errors

- Check `JWT_SECRET` matches between token generation and verification
- Tokens are blacklisted on logout — check `tokenBlacklist` if re-use is failing

### Database connection issues

```bash
node scripts/test-db-connection.js
```

Check `DATABASE_URL` format: `postgresql://user:password@host:port/dbname`

For RDS, ensure `ssl: { rejectUnauthorized: false }` in development or provide the CA cert in production.

### Socket.io not connecting

- Ensure `VITE_SOCKET_URL` points to the correct backend
- Check CORS origin in backend config includes the frontend URL
- Verify the user is authenticated before the socket connection is established

### PDF generation failing

- PDFKit writes to a stream — ensure the response is not ended before the stream finishes
- For S3 uploads, verify `AWS_S3_BUCKET` and IAM permissions (`s3:PutObject`, `s3:GetObject`)

---

## Contributing

Follow the conventions in `.amazonq/rules/memory-bank/guidelines.md`:

- Module factory pattern for all new modules
- Explicit dependency injection — no globals
- Zod validation on all inputs
- Parameterized SQL queries only
- camelCase in API/frontend, snake_case in DB
- Structured logging with Pino (`logger.info({ module, requestId }, 'message')`)
