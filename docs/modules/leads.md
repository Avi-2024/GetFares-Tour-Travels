# Leads module

## 1. Module overview

The **leads** module is the main CRM surface for **sales leads**: list/create/update, **RBAC-scoped** visibility, **assignment** (manual, auto, round-robin, bulk distribute), **follow-ups**, **SLA** automation, **temperature**, **duplicates**, **activities**, and **queued** leads when no agent is available. Code lives under `backend/crm/modules/leads`. HTTP base path is typically **`/api/leads`**. Data access uses **`leads.repository.js`** only; the database is **MySQL** via `mysql2` and the shared adapter in `backend/crm/core/database/connection.js`.

## 2. Flow: route → controller → service → repository

```
leads.routes.js
  → leads.controller.js
  → leads.service.js (domain rules, visibility, events)
  → leads.repository.js (SQL / db helpers)
```

`leads.validation.js` validates bodies and queries. `leads.events.js` publishes domain events for other subscribers.

## 3. Step-by-step execution

1. **Auth:** Most routes use **`requireAuth`** + **`authorize(...)`**. **`POST /public-capture`** uses **`optionalAuth`** so web forms can create leads without a logged-in user.
2. **Validation:** Zod fills **`req.validated`**.
3. **Controller** forwards to the matching **service** method with **`req.context`** (user, role, permissions).
4. **Service** applies **access rules** (`canUserAccessLead` for single-lead operations), business rules (qualification, follow-up compliance, temperature), and calls the **repository**.
5. **Repository** runs **MySQL** queries (`?` placeholders), generic **`db.insert` / `db.findMany`**, or introspection via **`information_schema`** when optional columns/tables exist.
6. **Events** and **`lead_activities`** rows record important changes.

## 4. Function explanations (repository focus)

| Piece | Role |
|--------|------|
| `findAll` | Paginated list with filters (status, source, assignee, countries, search, SLA, sort). Uses raw SQL on MySQL with `LIMIT ? OFFSET ?` and expanded `IN (...)` for id lists. |
| `findById` / CRUD helpers | Map rows to domain objects expected by the service. |
| Lead code helpers | Reserve or assign **`lead_code`** without Postgres sequences (scan / increment patterns). |
| `findUserAgentCountry` / `findUserCountryNames` | Resolve country from **`user_countries`** + **`countries`** when those tables exist. |
| `findActiveAgentsByCountry` / `findManagedAgentIds` | Support assignment and manager visibility. |
| `listQueuedLeads` / queue mutations | **`queued_leads`** table when present. |
| `findSlaBreachCandidates` | Raw query for OPEN leads past **`response_deadline`** with **`sla_breached`** still clear. |
| `getTableColumns` / `hasTable` | Cache **`information_schema.COLUMNS` / `TABLES`** for **`DATABASE()`** to support optional schema. |

(Service and controller details stay in code; this file highlights data paths.)

## 5. Request / response examples

**Create** — `POST /api/leads`

```json
{
  "fullName": "Jane Doe",
  "phone": "+919876543210",
  "email": "jane@example.com",
  "leadCountry": "India",
  "destinationName": "Dubai",
  "source": "website",
  "autoAssign": true
}
```

Typical success — `201`:

```json
{
  "data": {
    "id": "...",
    "leadCode": "...",
    "status": "OPEN",
    "temperature": "HOT"
  }
}
```

**List** — `GET /api/leads?page=1&limit=15`

Response includes **`data`** (array of leads) and **`pagination`** (`total`, `page`, `limit`, …) as implemented by the service.

**Assign** — `POST /api/leads/:id/assign`

```json
{ "assignedTo": "<user-id>", "mode": "MANUAL" }
```

## 6. Database tables used

| Table | Usage |
|--------|--------|
| `leads` | Core lead rows (status, assignment, SLA, temperature, customer link, …). |
| `customers` | Linked customer when **`customer_id`** exists. |
| `lead_activities` | Audit trail of actions. |
| `followups` | Scheduled follow-ups (calls, WhatsApp, cadence). |
| `lead_followup_alert_logs` | Deduping overdue follow-up notifications. |
| `queued_leads` | Leads waiting for assignment when the queue feature is enabled. |
| `users`, `roles` | Assignees and role names. |
| `countries`, `user_countries` | Multi-country scope for agents. |
| `lead_assignment_history` | History of assignments. |
| `destinations` | Destination names for travel intent. |
| `app_settings` | System date/time preferences for automation. |

(Exact columns match your MySQL schema.)

## 7. Business rules

- **Visibility:** Agents usually see only leads they may work (assigned + country scope). Managers see their team; admins may see all depending on RBAC.
- **Statuses:** Pipeline from **OPEN** toward **CONVERTED** / **LOST** / **NON_RESPONSIVE**; sub-statuses and follow-up **compliance** gates exist in the service.
- **Assignment:** Round-robin and caching spread load; bulk **distribute** fills unassigned **OPEN** leads.
- **SLA:** Automation finds candidates past **`response_deadline`** without **`response_at`** and may mark breach and reassign.
- **Duplicates:** Email/phone checks may link or block new leads depending on schema (**`customer_id`**) and service rules.

## 8. Notes for developers

- Set **`MYSQL_*`** env vars like other modules (`connection.js`). Missing MySQL config may fall back to an **in-memory** adapter (limited raw SQL).
- **Risky areas:** large **`findAll`** raw queries (filters, `REGEXP_REPLACE`, JSON-like fields); **boolean** columns stored as **0/1** in MySQL; **transactions** if you add multi-step writes—use `pool.getConnection()` + `beginTransaction` / `commit` / `rollback` / `release`.
- **JSON:** Objects passed through generic `insert`/`update` are adapted for MySQL JSON columns in the shared layer.
- **`leads-module.md`** has a longer HTTP map and service summary; use both docs together.
