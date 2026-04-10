# Quotations module — developer guide

**Location:** `backend/crm/modules/quotations`  
**Base URL:** `/api/quotations`

End-to-end **quotation** lifecycle for travel sales: build quotes from **lead** + **line items**, compute **pricing/margins**, optional **templates**, **PDF** generation (upload to **S3**), **send** via **EMAIL** (mail service) or **WHATSAPP**/manual, **view tracking**, **margin approval**, **status** (customer approve/reject), **reminder automation**, **templates** CRUD, and **lead→quote** reporting.  
Dependencies: **`dependencies.storage.s3`**, **`dependencies.services.mail`** (for email send).

**RBAC (typical):** `quotations:read` / `quotations:create` / `quotations:update`; **`reports:read`** for **`GET /reports/lead-to-quote`**.

**Main tables (`quotations.schema.js`):** `quotations`, `quotation_items`, `quotation_views`, `quotation_templates`, `quotation_version_logs`, `quotation_send_logs`, `quotation_reminder_logs`, plus reads/writes on **`leads`**, **`bookings`**, **`users`**, **`destinations`**, **`destination_pricing`**, **`app_settings`**.

---

## 1. High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | Auth on almost all routes; **`POST /:id/viewed`** has **no** `requireAuth` (public tracking). |
| **Controller** | Parses validated input; **`generatePdf`** passes **`requestBaseUrl`**; **`trackView`** adds IP + User-Agent. |
| **Service** | Large domain layer (~1.8k lines): pricing, SLA by response category, PDF buffer + S3, email send, version logs, events. |
| **Repository** | Maps DB rows ↔ domain, joins for list, template CRUD, reminder candidates, reports. |

---

## 2. Step-by-step flow (typical)

1. **`requireAuth`** (except **`trackView`**) → **`authorize`**.  
2. **`validateRequest`** (Zod).  
3. **Controller** → **service**.  
4. **Service** loads lead/template, runs **calculatePricing** / **calculateFinanceBreakdown**, writes **quotation** + **items**, **version log**, **`emit*`** events.  
5. **Repository** persists to Postgres via **`db`**.

---

## 3. HTTP map (summary)

| Area | Examples |
|------|----------|
| **Templates** | `GET/POST /templates`, `PATCH /templates/:id` |
| **Reports** | `GET /reports/lead-to-quote` |
| **Reminders** | `POST /reminders/run` |
| **CRUD** | `GET/POST /`, `GET/PATCH /:id` |
| **PDF** | `POST /:id/generate-pdf` |
| **Send** | `POST /:id/send` |
| **Views** | `POST /:id/viewed` (no auth), `GET /:id/views` |
| **Versions / send logs** | `GET /:id/versions`, `GET /:id/send-logs` |
| **Margin** | `POST /:id/approve-margin` |
| **Status** | `POST /:id/status` (APPROVED / REJECTED) |

Static paths (`/templates`, `/reports/...`, `/reminders/run`) are registered **before** `/:id` so they are not captured as ids.

---

## 4. Function-wise explanation (condensed)

### Controller (`quotations.controller.js`)

| Handler | Notes |
|---------|--------|
| `list` | Passes query + **context**; optional **`includeItems`**. |
| `getById` | **`includeItems: true`**, **`includeRelations: true`**. |
| `create` / `update` | Body only. |
| `generatePdf` | Builds **`requestBaseUrl`** for absolute links in PDF if needed. |
| `send` | Forwards **context**. |
| `trackView` | Merges **IP** (from `x-forwarded-for`) and **user-agent**. |
| `approveMargin` / `transitionStatus` | Standard. |
| `listViews` / `listVersions` / `listSendLogs` | Audit/history. |
| `runReminders` | Batch automation. |
| `leadToQuoteReport` | Report query params. |
| `listTemplates` / `createTemplate` / `updateTemplate` | Template catalog. |

### Service (`quotations.service.js`) — main behaviors

| Topic | Behavior |
|-------|----------|
| **Statuses** | `DRAFT` → `SENT` → `VIEWED`; customer can end as `APPROVED` / `REJECTED` / `EXPIRED` (not all paths detailed here). |
| **Pricing** | **Components** (line items with cost) + **margin %** + tax/discount fields → **total cost**, **final price**, **total sale value**, currencies. |
| **Margin approval** | If **margin %** &lt; **min margin** (from payload or template), **`requiresApproval`** true until **`approveMargin`**. **Send** is blocked until margin approved. |
| **Response SLA** | Category (`READY_PACKAGE` / `CUSTOMIZED` / `COMPLEX_ITINERARY`) maps to **minutes**; **send** computes **lead→quote sent** minutes and **breached** flag. |
| **Travel date** | **`ensureQuotationTravelStartDate`** — must resolve from **builder snapshot** or **lead**; else **400**. |
| **create** | Validates lead + optional template; inserts quotation + **`replaceItems`**; **version log** `CREATED`; **`quotations.created`**. |
| **update** | **409** if **APPROVED** (locked); recomputes pricing; bumps **version**; **version log** `UPDATED`; **`quotations.updated`**. |
| **generatePdf** | Renders PDF (PDFKit) or uses provided **`pdfUrl`**; uploads to **S3**; stores **`pdf_url`**; **`quotations.pdf_generated`**. |
| **send** | Requires **not** `requiresApproval`; ensures **PDF** (generates if missing); **EMAIL** uses **`mailService`**; updates status **SENT**, lead **QUOTED**, send log; **`quotations.sent`**. |
| **trackView** | Inserts **view** row, increments **view_count**; **`quotations.viewed`**. |
| **approveMargin** | Clears **`requires_approval`**, records approver; **`quotations.margin_approved`**. |
| **transitionStatus** | **APPROVED** / **REJECTED** only; from **DRAFT/SENT/VIEWED**; **409** if margin still required for approve; updates lead to **CONVERTED** or **LOST**; **`quotations.status_changed`**. *(Helper **`ensureBookingForApprovedQuote`** exists in file but is **not** invoked here—booking creation may be done elsewhere.)* |
| **list** | Enriches with **lead**, **destination**, **createdByUser**; optional **items** per row. |
| **runReminderAutomation** | Finds candidates, writes **reminder logs**, **`quotations.reminder_triggered`**. |
| **getLeadToQuoteReport** | Delegates to repository report SQL. |
| **Templates** | Duplicate **code** check; CRUD on template table. |

### Repository (`quotations.repository.js`)

Maps **`quotations`** and related tables; **`findAll`** with filters; **`replaceItems`**; **`createView`**, **`incrementViewStats`**; **`createSendLog`**, **`createVersionLog`**, **`createReminderLog`**; **`findReminderCandidates`**; **`getLeadToQuoteReport`**; template and lead lookups; **`updateLeadStatus`**; **`createBooking`** (used if booking flow is wired from service). Uses **column introspection** for safe inserts.

### Events (`quotations.events.js`)

| Event | When |
|-------|------|
| `quotations.created` | After create |
| `quotations.updated` | After update |
| `quotations.sent` | After send |
| `quotations.viewed` | After track view |
| `quotations.status_changed` | After status transition |
| `quotations.pdf_generated` | After PDF stored |
| `quotations.margin_approved` | After margin approval |
| `quotations.reminder_triggered` | Reminder batch |

Each logs **`logger.info`** then **`eventBus.emit`**.

### Validation (`quotations.validation.js`)

- **create:** `leadId`, **`components`** min 1, **`marginPercent`**, optional **template**, **builderSnapshot**, currencies, etc.  
- **send:** **EMAIL** requires **recipientEmail**; **WHATSAPP** requires **recipientPhone**.  
- **statusTransition:** **REJECTED** requires **reason**.  
- Templates, list filters, PDF body optional, etc.

---

## 5. Input → processing → output (patterns)

| Action | Input | Output |
|--------|--------|--------|
| **Create** | Lead + priced components + snapshot | Quotation + items + relations |
| **Update** | Patch (not when APPROVED) | Updated quotation |
| **Generate PDF** | Optional external **pdfUrl** | Quotation with **pdfUrl** |
| **Send** | Channel + recipients | **SENT** quotation + logs |
| **Track view** | Optional device info + IP (server) | View record + counts |
| **Approve margin** | Optional note | Clears approval flag |
| **Status** | APPROVED/REJECTED + optional travel dates | Quotation + lead updated |

---

## 6. Business logic (simple terms)

- A **quotation** is a priced offer for a **lead**, built from **components** (hotel, flight, etc.).  
- **Selling price** and **margins** drive whether **manager approval** is required before **send**.  
- **Sending** marks the quote **SENT**, stores **PDF**, can **email** the customer, and moves the lead toward **QUOTED**.  
- **Customer opens** the link → **views** recorded (can work without login).  
- **Approving/rejecting** the quote (customer) updates **lead** status (**CONVERTED** / **LOST**).  
- **Templates** standardize legal text and minimum margins.  
- **Reminders** are batch jobs for follow-ups on stale quotes.

---

## 7. Database operations

| Operation | Tables (typical) |
|-----------|-------------------|
| **SELECT** | `quotations`, `quotation_items`, `leads`, `users`, `destinations`, reports |
| **INSERT** | `quotations`, `quotation_items`, views, version logs, send logs, reminder logs, templates, bookings (if used) |
| **UPDATE** | `quotations`, `leads` status |

---

## 8. Validations and conditions

- Zod on HTTP; service **AppError** for **404** lead/template, **409** locked/approval, **400** missing email/travel date, etc.  
- **`create`** requires **travel start** resolvable from snapshot or lead.

---

## 9. Side effects (emails, notifications, automation)

| Kind | Details |
|------|---------|
| **Email** | **`send`** with **`channel: EMAIL`** uses **`mailService`** (actual provider in mail module). |
| **S3** | **PDF** upload in **`generatePdf`** / **send** when generating PDF. |
| **Event bus** | All **`quotations.*`** events — **notifications** module subscribes for in-app alerts. |
| **WhatsApp** | Channel validated; delivery implementation depends on integration (not necessarily full in this file). |
| **Cron** | **`POST /reminders/run`** is manual/cron-triggered automation. |

---

## 10. Example API request/response

**Create** — `POST /api/quotations`

```json
{
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "components": [
    { "itemType": "HOTEL", "description": "4 nights Dubai", "cost": 80000 }
  ],
  "marginPercent": 18,
  "clientCurrency": "INR",
  "builderSnapshot": {
    "lead": {},
    "package": { "name": "Dubai Deluxe" },
    "travelStartDate": "2026-09-01"
  }
}
```

**Send** — `POST /api/quotations/:id/send`

```json
{
  "channel": "EMAIL",
  "recipientEmail": "customer@example.com",
  "expiresInHours": 72
}
```

**Status** — `POST /api/quotations/:id/status`

```json
{
  "status": "APPROVED",
  "travelStartDate": "2026-09-01",
  "travelEndDate": "2026-09-06"
}
```

**Public view** — `POST /api/quotations/:id/viewed` (no `Authorization` header required).

---

## 11. Notes for developers

- **Service file is large** — search for **`async function`** / **`return Object.freeze`** for the exported API surface.  
- **`trackView`** is intentionally **unauthenticated** for customer links; consider **rate limiting** at gateway if abused.  
- **`transitionStatus`** returns **`booking: null`** in current code; **booking** creation helper exists but is **not** called—confirm product flow (bookings module may create from **APPROVED** elsewhere).  
- **List** with **`includeItems: true`** runs **N+1** queries—watch performance.  
- Ensure **S3** and **mail** are configured in **`dependencies`** or PDF/email paths fail with clear errors.
