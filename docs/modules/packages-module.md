# Packages module — developer guide

**Location:** `backend/crm/modules/packages`  
**Base URL:** `/api/packages` (mounted with other feature modules in `backend/crm/modules/index.js`)

Manages **travel packages** (pricing, content, SEO, website flags) in **`packages`**, plus **package enquiries** in **`package_enquiries`**.  
**RBAC:** **`settings:read`** / **`settings:update`** for package CRUD and publish; **`leads:read`** to list enquiries; **`leads:create`** to record an enquiry.  
Events: **`packages.created`**, **`packages.updated`**, **`packages.published`**, **`packages.enquiry.created`** (via `eventBus`). No email inside this module.

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | `requireAuth`, `authorize`, Zod `validateRequest`, controller. |
| **Controller** | Maps `req.validated` + `req.context` to service; **200** / **201**. |
| **Service** | Maps API ↔ DB; **starting price** rules; soft-delete guard; **`toPackage` / `toEnquiry`**; events. |
| **Repository** | `findMany` / `findById` / `insert` / `update` on `packages`; enquiry **insert** / **list**; JSON serialization for **`custom_services`** and **`itinerary`**. |

---

## Step-by-step flow

1. **`requireAuth`** → **`authorize(...)`** (permission varies by route).  
2. **`validateRequest`** → **`req.validated`**.  
3. **Controller** → **service**.  
4. **Service** → **repository**; optional **events**.  
5. Response **`{ data: ... }`**.

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `settings:read` |
| POST | `/` | `settings:update` |
| GET | `/:id` | `settings:read` |
| PATCH | `/:id` | `settings:update` |
| POST | `/:id/publish` | `settings:update` |
| GET | `/:id/enquiries` | `leads:read` |
| POST | `/:id/enquiries` | `leads:create` |

`GET /` and `POST /` are registered before `/:id`, so list/create are not treated as ids.

---

## Function-wise explanation

### `index.js` — `createPackagesModule`

Wires **repository**, **events**, **service**, **controller**, **router**.

### `packages.controller.js`

| Handler | Service | Status |
|---------|---------|--------|
| `list` | `list(query, context)` | 200 |
| `getById` | `getById(id, context)` | 200 |
| `create` | `create(body, context)` | 201 |
| `update` | `update(id, body, context)` | 200 |
| `publish` | `publish(id, body, context)` | 200 |
| `createEnquiry` | `createEnquiry(id, body, context)` | 201 |
| `listEnquiries` | `listEnquiries(id, context)` | 200 |

### `packages.service.js`

| Name | Purpose |
|------|---------|
| `toPackage` / `toEnquiry` | DB row → camelCase API. |
| `requirePackage` | **404** `PACKAGE_NOT_FOUND` if missing or **`is_deleted`**. |
| `computeStartingPrice` | Uses **baseCost**, **markupPercent**, optional **startingPrice**; **starting price must be &gt; base cost** when base &gt; 0 (**400** `PACKAGE_INVALID_PRICING`). If **startingPrice** omitted, derives `base * (1 + markup/100)`. |
| `buildPatch` | Maps update body → snake_case patch; recomputes pricing when cost/markup/starting touched; **sold out** forces **status `SOLD_OUT`**; **publishToWebsite** sets **`website_last_synced_at`**. |
| `list` | `findAll` with repo filters, then **in-memory** filter: not deleted, optional **destination** substring, optional **search** on name+destination. |
| `create` | Default **status** `DRAFT`; **packageKind** READY vs CUSTOMIZED; audit **`created_by` / `updated_by`**. |
| `update` | `buildPatch` → `update` → **`emitUpdated`**. |
| `publish` | Sets **`publish_to_website`** (default **true** in body when omitted in logic: `payload.publishToWebsite ?? true`), **status** → **ACTIVE** if publishing, timestamps **`emitPublished`**. |
| `createEnquiry` | Ensures package exists; default **source** `"Website - Package Page"`; **`emitEnquiryCreated`**. |
| `listEnquiries` | Ensures package exists; lists enquiries for **`package_id`**. |

### `packages.repository.js`

| Function | DB |
|----------|-----|
| `findAll` | Maps query filters to **`status`**, **`package_category`**, **`publish_to_website`**, **`is_sold_out`** → **`db.findMany`**. |
| `findById` / `create` / `update` | **`packages`**; JSON columns serialized for Postgres. |
| `createEnquiry` / `listEnquiriesByPackageId` | **`package_enquiries`**. |

### `packages.validation.js`

- **Status:** `DRAFT` \| `ACTIVE` \| `EXPIRED` \| `SOLD_OUT`.  
- **Category / kind** enums as in file.  
- **Create:** required **name**, **destination**; rich optional fields.  
- **Update:** ≥1 field.  
- **Publish:** optional **`publishToWebsite`**.  
- **Enquiry:** optional **leadId**, contact fields, **travelDate**, etc.

### `packages.events.js`

Emits with try/catch warn on failure (no `logger.info` on success—unlike some modules).

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Filters + optional **search** / **destination** (service-side) | Repo filter + memory filter | Array of packages |
| **Get** | UUID | Not deleted | One package |
| **Create** | Full body | Pricing validation, defaults | **201** package |
| **Patch** | Partial | `buildPatch` | **200** package |
| **Publish** | Optional flag | ACTIVE + sync timestamp when publishing | **200** package |
| **Create enquiry** | Contact + travel fields | Insert enquiry row | **201** enquiry |
| **List enquiries** | Package id | All enquiries for package | Array |

---

## Business logic (simple terms)

- **Packages** are sellable products: **cost**, **markup**, **starting price** (must exceed base cost when base &gt; 0).  
- **READY** vs **CUSTOMIZED** toggles structured **customServices** JSON lines.  
- **Website:** **`publishToWebsite`**, **slug**, SEO fields, **gallery**; **`publish`** endpoint is the explicit “go live” path and sets **ACTIVE** when turning website publish on.  
- **Sold out** sets status **SOLD_OUT**.  
- **Enquiries** capture interest against a package (link to **lead** optional); used for CRM follow-up, not checkout.

---

## Database operations

| Operation | Table |
|-----------|--------|
| **SELECT** | `packages`, `package_enquiries` |
| **INSERT** | `packages`, `package_enquiries` |
| **UPDATE** | `packages` |

---

## Validations and conditions

- Zod on HTTP; service **404** for missing/deleted package.  
- **400** `PACKAGE_INVALID_PRICING` if starting price ≤ base cost (when base &gt; 0).  
- **403** from **`authorize`** if role lacks permission.

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | `packages.*` and `packages.enquiry.created` |
| **Logs** | `logger.debug` on repository writes |
| **Email / notifications** | **None** in-module |

---

## Example API request/response

**Create** — `POST /api/packages`

```json
{
  "name": "Dubai 5D/4N Premium",
  "destination": "Dubai",
  "duration": "5D/4N",
  "baseCost": 45000,
  "markupPercent": 20,
  "packageKind": "READY",
  "status": "DRAFT",
  "publishToWebsite": false
}
```

**Publish** — `POST /api/packages/:id/publish`  
Body optional: `{ "publishToWebsite": true }`

**Enquiry** — `POST /api/packages/:id/enquiries`

```json
{
  "fullName": "Jane Doe",
  "phone": "+919876543210",
  "email": "jane@example.com",
  "travelDate": "2026-08-01",
  "travellersCount": 2,
  "source": "Website - Package Page"
}
```

---

## Notes for developers

- **List** applies **search** and **destination** in **service** after fetch—very large catalogs may need **repository-level** search/pagination later.  
- **`page` / `limit`** appear in validation for **list** but **service `list`** currently returns **all** filtered rows (no pagination object)—confirm with product expectations.  
- **`itinerary`** is **z.any()**—can be object or array; stored as JSON.  
- **Permissions** intentionally mix **settings** and **leads** so marketing can edit catalog while sales-focused roles handle enquiries.  
- Linking enquiries to **`leadId`** is optional—workflows may create a **lead** elsewhere and PATCH later.
