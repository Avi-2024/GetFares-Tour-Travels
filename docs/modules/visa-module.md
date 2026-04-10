# Visa module — developer guide

**Location:** `backend/crm/modules/visa`  
**Base URL:** `/api/visa`

Manages **visa cases** (`visa_cases`) tied to optional **booking** and **supplier**, with a **workflow stage** (collection → submission → biometrics → decision → delivered), **documents** (`visa_documents`) including optional **S3** upload, and a per-**booking** **documentation checklist** (`documentation_checklist`) for travel readiness. Exposes a **summary report** for dashboards.

**Dependencies:** **`dependencies.storage.s3`** for **`POST /:id/documents`** when uploading a **file** (multipart). Without **`s3.uploadBuffer`**, upload returns **500** `S3_NOT_CONFIGURED`.

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | Specific paths (**`/reports/summary`**, **`/:id/documents`**, checklist, verify) registered **before** **`GET/PATCH /:id`** to avoid route shadowing. **Multer** memory upload on document **POST**. |
| **Controller** | Passes body/query to **service**; **createDocument** may call **S3** then sets **`fileUrl`**. |
| **Service** | Workflow rules, stage transitions, enrichment (**days to expiry**, **expiryStatus**), checklist **travelReady** logic, events. |
| **Repository** | CRUD **visa_cases** / **visa_documents**; checklist **find/upsert**; **getSummaryReport** SQL or fallback loop; **column sanitize** via **`information_schema`**. |
| **Events** | Case and document lifecycle + checklist (see below). |

**Permissions:** **`visa:read`** (list, get, documents, checklist, report), **`visa:create`**, **`visa:update`** (mutations, verify, checklist PATCH, status **POST**).

---

## Step-by-step flow

1. **`requireAuth`** + **`authorize`**.  
2. **`validateRequest`** (Zod).  
3. Document **POST:** **`upload.single("file")`** → optional **S3** → **`fileUrl`**.  
4. **Controller** → **service** → **repository**.  
5. **Service** emits **events** after creates/updates/status/checklist/documents.

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/reports/summary` | `visa:read` |
| GET | `/` | `visa:read` |
| POST | `/` | `visa:create` |
| GET | `/:id` | `visa:read` |
| PATCH | `/:id` | `visa:update` |
| POST | `/:id/status` | `visa:update` |
| GET | `/:id/documents` | `visa:read` |
| POST | `/:id/documents` | `visa:update` (+ file upload) |
| PATCH | `/documents/:documentId/verify` | `visa:update` |
| GET | `/:id/checklist` | `visa:read` |
| PATCH | `/:id/checklist` | `visa:update` |

---

## Function-wise explanation

### Controller

| Handler | Notes |
|---------|--------|
| `list` / `getById` / `create` / `update` / `transitionStatus` | Standard pass-through. |
| `createDocument` | If **`req.file`**, uploads to **`visa/{visaCaseId}/documents/...`** via **S3**; requires **`fileUrl`** or upload. |
| `listDocuments` / `verifyDocument` / `getChecklist` / `updateChecklist` | Forward to service. |
| `getSummaryReport` | Query **from**/**to** for report. |

### Service

| Function | Purpose |
|----------|---------|
| **`enrichVisaCase`** | Normalizes **workflowStage**; sets **`status`** from **`STAGE_TO_STATUS`**; **`daysToExpiry`**, **`expiryStatus`** (NOT_SET / EXPIRED / EXPIRING_SOON ≤14 days / ACTIVE), **`isDelivered`**. |
| **`list`** | **`repository.findAll`** → map **enrichVisaCase**. |
| **`getById`** | **404** if missing; **enrichVisaCase**. |
| **`create`** | Ensures **booking** / **supplier** exist when ids provided; **`validateStageRequirements`**; stores **workflow_stage** + derived **status**; **`emitCreated`**. |
| **`update`** | Merge with current; same validation; clears **delivered_at** when leaving **DELIVERED**; **`emitUpdated`**. |
| **`transitionStatus`** | Loads current stage; **target** must equal current **or** be allowed in **`STAGE_TRANSITIONS`**; **409** on illegal jump; patches dates/reason/visa number; **`emitStatusChanged`** + **`emitUpdated`**. |
| **`createDocument`** | Inserts document; if **verified** at create and type maps to checklist (**PASSPORT**, **VISA**, etc.), **`upsertChecklist`** sets matching flag; **`emitDocumentAdded`**. |
| **`listDocuments`** | After **getById**; optional **isVerified** filter in service layer after fetch. |
| **`verifyDocument`** | Updates **is_verified**; syncs checklist column for mapped **documentType**; **`emitDocumentVerified`**. |
| **`getChecklist`** | Requires **visa case** with **bookingId**; returns row or **defaults** (all false). |
| **`updateChecklist`** | Merges flags; **`travel_ready`** = payload or **computeTravelReady** (all eight checks true); sets **verified_by/at**, **completed_at**; **`emitChecklistUpdated`**. |
| **`getSummaryReport`** | Delegates **repository.getSummaryReport**. |

**Constants:** **`VISA_STATUS`** (DOCUMENT_PENDING, SUBMITTED, APPROVED, REJECTED), **`VISA_WORKFLOW_STAGE`** (seven stages). Checklist doc map links **document types** to checklist columns (passport, visa, insurance, ticket, hotel, transfer, tour, itinerary).

### Repository

| Method | DB |
|--------|-----|
| `findAll` / `findById` / `create` / `update` | **`visa_cases`** (sanitized columns) |
| `findBookingById` / `findSupplierById` | **`bookings`**, **`suppliers`** |
| `createDocument` / `listDocuments` / `findDocumentById` / `updateDocument` | **`visa_documents`** |
| `getChecklistByBookingId` / `upsertChecklist` | **`documentation_checklist`** |
| `getSummaryReport` | **SELECT** aggregates on **`visa_cases`** + pending unverified docs count; fallback **findMany** if no raw SQL |

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **Create/update case** | Country, visa type, optional booking/supplier, stage fields | Validate refs + stage fields | Enriched visa case |
| **Transition** | Target **workflowStage** (or legacy **status** mapping in Zod) | Graph check + field rules | Enriched case |
| **Upload document** | Multipart **file** or **fileUrl**, **documentType** | S3 optional; insert row | Document row |
| **Verify document** | **isVerified** | Update row; checklist sync | Document row |
| **Checklist** | Boolean flags | Upsert by **booking_id** | Checklist DTO |
| **Summary report** | **from** / **to** dates | SQL or in-memory stats | Counts, rates, avg days, expiring soon |

---

## Business logic (simple terms)

- A **visa case** tracks one visa application line: destination **country**, **visa type**, fees, dates, and a **workflow stage**.  
- **High-level status** in responses is **derived from the stage** (e.g. several stages map to **SUBMITTED**).  
- **Stages** move only along **`STAGE_TRANSITIONS`** when using **`POST /:id/status`**.  
- **Biometrics** stage needs an **appointment date**. **Approved / delivered** need **visa valid until**. **Rejected** needs a **reason**.  
- **Documents** can be uploaded to **S3** or by passing a **fileUrl** (e.g. pre-uploaded).  
- **Checklist** is per **booking**: eight items must be true for **travel ready** (auto-calculated unless overridden). Verified documents of certain **types** auto-flip checklist flags.  
- **Expiry** helpers flag visas expiring within **14 days**.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | **`visa_cases`**, **`visa_documents`**, **`documentation_checklist`**, **`bookings`**, **`suppliers`** |
| **INSERT** | **`visa_cases`**, **`visa_documents`**, **`documentation_checklist`** |
| **UPDATE** | **`visa_cases`**, **`visa_documents`**, **`documentation_checklist`** |

---

## Validations and conditions

- **Zod:** UUIDs for ids; **country** / **visaType** lengths; **date** fields; **create** requires **country** + **visaType**; **update** ≥1 field; **transition** requires **status** or **workflowStage**; checklist **PATCH** ≥1 field; **verify** requires **isVerified** boolean.  
- **Stage requirements** (Zod **superRefine** + service **`validateStageRequirements`**): appointment for **BIOMETRICS_SCHEDULED**; **visaValidUntil** for **APPROVED** / **DELIVERED**; **rejectionReason** for **REJECTED**.  
- **Service:** **409** invalid transition; **404** missing case/document; **409** checklist without **booking** on case.

---

## Side effects

| Kind | Details |
|------|---------|
| **S3** | File bytes stored under **`visa/{caseId}/documents/`** when **file** present. |
| **Event bus** | **`visa.created`**, **`visa.updated`**, **`visa.status_changed`**, **`visa.document_added`**, **`visa.document_verified`**, **`visa.checklist_updated`** — use for notifications. |
| **Email** | **None** in-module. |

---

## Example API request/response

**Create case** — `POST /api/visa`

```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "country": "United Arab Emirates",
  "visaType": "Tourist",
  "workflowStage": "DOCUMENT_COLLECTION",
  "fees": 7500
}
```

**Transition** — `POST /api/visa/:id/status`

```json
{
  "workflowStage": "APPROVED",
  "visaValidUntil": "2027-04-01",
  "visaNumber": "UAE-123456"
}
```

**Upload document** — `POST /api/visa/:id/documents`  
`multipart/form-data`: field **`file`** (binary), **`documentType`** (e.g. `PASSPORT`). Requires **S3** configured.

**Summary** — `GET /api/visa/reports/summary?from=2026-01-01&to=2026-12-31`

---

## Notes for developers

- **`enrichVisaCase`** overwrites **`status`** from **workflow stage** — treat **stage** as source of truth in API responses.  
- **`POST /:id/status`** expects **workflow-oriented** payload; **`status`** alone maps to a stage only where **Zod** **`resolveTargetStage`** supports it.  
- **Checklist** table name is **`documentation_checklist`** — must exist for upsert.  
- **Repository** strips unknown columns per DB — migrations must add columns before service sends them.  
- **`getSummaryReport`** without raw SQL uses a simpler in-memory aggregation (less accurate for large data).  
- Register **`visa:*`** permissions in RBAC for operators handling visa ops.
