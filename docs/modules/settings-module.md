# Settings module — developer guide

**Location:** `backend/crm/modules/settings`  
**Base URL:** `/api/settings`

Stores **app-wide configuration** as JSON blobs in **`app_settings`**, keyed by **`system`** and **`integrations`**. Merges DB values with **in-code defaults** so missing rows still return sensible UI. **Updates** are **upserts** (insert or update by key).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | GET all / per-section; PATCH **system** & **integrations**. Mixed RBAC (see below). |
| **Controller** | Maps HTTP actions to **`getAll`**, **`getSection`**, **`getSystemPreferences`**, **`updateSection`**. |
| **Service** | Defaults + merge logic; **`updateSection`** merges **defaults → DB → payload** then saves. |
| **Repository** | **`findByKey`**, **`upsert`** on **`app_settings`**. |
| **Events** | **`settings.updated`** after each successful section save. |

**Table (`settings.schema.js`):** **`app_settings`** — at least **`key`**, **`value`** (JSON), **`updated_by`**, timestamps (exact columns depend on DB adapter).

---

## Step-by-step flow

1. **`requireAuth`** (all routes).  
2. **`authorize`** — only where listed (see HTTP map). **Skipped** for **`GET /system/preferences`**.  
3. **`validateRequest`** (Zod); PATCH requires **at least one** body field per section.  
4. **Controller** → **service** → **repository**.  
5. On PATCH: **`events.emitUpdated(section, savedRow)`**.

---

## HTTP map

| Method | Path | AuthZ | Notes |
|--------|------|--------|--------|
| GET | `/` | `settings:read` | Full **`{ system, integrations }`** |
| GET | `/system` | `settings:read` | System section only |
| GET | `/system/preferences` | **none** (login only) | **Timezone, locale, dateFormat** subset for any logged-in user |
| PATCH | `/system` | `settings:update` | Partial **system** fields |
| GET | `/integrations` | `settings:read` | Integrations section |
| PATCH | `/integrations` | `settings:update` | Partial **integration** fields |

**Static path order:** `/system` and `/system/preferences` are registered **before** generic routes would conflict; current file has no `/:id` — safe.

---

## Function-wise explanation

### Controller

| Handler | Calls | Response |
|---------|--------|----------|
| `getAll` | `service.getAll(context)` | 200 `{ data: { system, integrations } }` |
| `getSystem` | `service.getSection("system", context)` | 200 |
| `getSystemPreferences` | `service.getSystemPreferences(context)` | 200 |
| `updateSystem` | `service.updateSection("system", body, context)` | 200 |
| `getIntegrations` | `service.getSection("integrations", context)` | 200 |
| `updateIntegrations` | `service.updateSection("integrations", body, context)` | 200 |

### Service

| Function | Purpose |
|----------|---------|
| **`getSectionKey(section)`** | Maps **`"system"`** / **`"integrations"`** → DB key; **400** if unknown. |
| **`getSectionDefaults(section)`** | Returns **`DEFAULT_SYSTEM_SETTINGS`** or **`DEFAULT_INTEGRATION_SETTINGS`**. |
| **`getSection(section)`** | **`findByKey`**; merges **defaults** with **`existing.value`** object. |
| **`getAll`** | **`Promise.all`** **`system`** + **`integrations`**. |
| **`pickSystemPreferences` / `getSystemPreferences`** | Returns only **timezone**, **locale**, **dateFormat** (with fallbacks). |
| **`updateSection(section, payload)`** | Merge **defaults → current from DB → payload**; **`repository.upsert(key, next, userId)`**; **`emitUpdated`**; returns **merged `next`** object (not necessarily raw DB row for response — service returns **`next`**). |

**Defaults (service):** company name, support email/phone, timezone **`Asia/Kolkata`**, locale **`en-IN`**, currency **`INR`**, date format **`DD/MM/YYYY`**, website URL; integrations: Meta/WhatsApp/SMTP/webhook placeholders, **`smtpPort`** **587**.

### Repository

| Method | DB |
|--------|-----|
| `listAll` | **`findMany`** `app_settings` (unused by routes; available for admin tooling). |
| `findByKey` | **`findOne`** by **`key`**. |
| `upsert` | If row exists → **`update`** by id; else **`insert`** with **`created_at`/`updated_at`**. |

### Events

| Event | Payload |
|-------|---------|
| **`settings.updated`** | **`{ section, payload }`** — **`payload`** is the saved record from DB adapter after upsert. |

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **Read** | — | Load by key; merge defaults | Plain object per section |
| **Read preferences** | — | System section → pick 3 fields | `{ timezone, locale, dateFormat }` |
| **PATCH** | Partial fields | Validate; deep merge; upsert | Full merged section object |

---

## Business logic (simple terms)

- Settings are **two JSON documents**: **company/locale** stuff vs **third-party credentials** (Meta, WhatsApp, SMTP, webhook).  
- **First save** creates the row; later saves **overwrite** merged JSON.  
- **Secrets** (tokens, passwords) live in the same JSON — protect **`settings:read`** / **`settings:update`** in production.  
- **`getSystemPreferences`** avoids requiring **`settings:read`** so the **UI** can format dates/times for any authenticated user.

---

## Database operations

| Operation | When |
|-----------|------|
| **SELECT** | **`findByKey`** on read; **`listAll`** not used by HTTP layer |
| **INSERT** | First upsert for a key |
| **UPDATE** | Upsert when row exists |

---

## Validations and conditions

- **System PATCH:** optional fields — **companyName**, **supportEmail**, **supportPhone**, **timezone** (IANA via **`Intl`**), **locale** (supported locale), **currency**, **dateFormat** (fixed set: **DD/MM/YYYY**, **MM/DD/YYYY**, **YYYY-MM-DD**, **DD-MM-YYYY**), **websiteUrl** (URL). Empty strings → **undefined** (omit from patch). **At least one** key required.  
- **Integrations PATCH:** Meta, WhatsApp, SMTP fields, **smtpPort** 1–65535, emails/URLs where applicable; **at least one** field.  
- **Read schemas:** empty body/params/query allowed.

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | **`settings.updated`** — subscribers may **refresh caches** or **audit**. |
| **Email / automation** | **None** in-module; **SMTP** values are **stored only** — **mail** module reads config elsewhere. |

---

## Example API request/response

**GET** `/api/settings/system`  
Headers: `Authorization: Bearer <token>` with **`settings:read`**

```json
{
  "data": {
    "companyName": "Get2Vacation Travel CRM",
    "supportEmail": "support@Get2Vacation.com",
    "supportPhone": "",
    "timezone": "Asia/Kolkata",
    "locale": "en-IN",
    "currency": "INR",
    "dateFormat": "DD/MM/YYYY",
    "websiteUrl": ""
  }
}
```

**PATCH** `/api/settings/integrations` (requires **`settings:update`**)

```json
{
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpUser": "noreply@example.com",
  "smtpFromEmail": "noreply@example.com"
}
```

**GET** `/api/settings/system/preferences` — any authenticated user:

```json
{
  "data": {
    "timezone": "Asia/Kolkata",
    "locale": "en-IN",
    "dateFormat": "DD/MM/YYYY"
  }
}
```

---

## Notes for developers

- **Do not** log full **`updateSection`** payloads in production — they may contain **tokens**.  
- Frontend should **mask** integration secrets on read if you add a **public** read path later.  
- **`service.updateSection`** returns merged **`next`**, not only DB row; event still receives **repository** return value.  
- Ensure **`app_settings.value`** column supports **JSON** / object storage for your adapter.  
- **`listAll`** exists but **no route** exposes it — use DB or add an admin route if needed.
