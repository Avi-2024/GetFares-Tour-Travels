# Canvas Prompt — Meta Qualification Mapping Engine (Dynamic)

**Use this prompt in Cursor / Canvas to implement.** Do not start coding until product signs off `docs/meta-lead-qualification-questions.md`.

---

## Role

You are a senior backend + fullstack engineer on **GetFares Travel CRM** (Node.js, Fastify/Nest-style modules, Prisma/MySQL, React CRM). Build a **config-driven Meta → CRM qualification mapper** that survives new Meta ads, adsets, and form renames.

---

## Business rules (confirmed)

### Markets (Meta pages)

| Env | Page ID | Market |
|-----|---------|--------|
| `META_INDIA_PAGE_ID` | `1021995967663811` | India desk |
| `META_UAE_PAGE_ID` | `958886697315918` | UAE desk |

### Lead type

- Leads from **India + UAE Meta pages** default to **`HOLIDAY`** unless the form matches the **visa assistance family** (field signature) → then **`VISA`**.
- Leads from **other Meta pages** (future) default **`VISA`** until a new family is added in config.
- Non-Meta sources: unchanged (agent picks type).

### Auto-fill on Meta webhook create (no agent action)

| CRM field | Rule |
|-----------|------|
| `fullName`, `phone`, `email`, `city` | Existing `FIXED_FIELD_ALIASES` |
| `leadCountry`, `country` | Page config → `India` or `United Arab Emirates` |
| `clientCurrency` | Page default: `INR` / `AED` (do **not** use nationality to override UAE desk AED) |
| `nationality` | Key `what_is_your_nationality` (+ aliases) |
| `destinationName`, `travelTo` | Priority: multi-destination interest → single destination → Maldives resort → visa assistance country |
| `travelPurpose` | Map from Maldives experience / who travelling with (enum) |
| `preferredHotelCategory` | Map from `preferred_stay_experience` (config table) |
| `budget` | India: `what_is_your_budget_per_person` bands → numeric |
| `salary` | UAE visa: `what_is_your_current_monthly_salary_in_the_aed` bands → numeric |
| `leadType` | Form family detector (see below) |
| `source` | Page `sourceLabel` (`Meta India Page`, `Meta UAE Page`) |
| `platform`, Meta IDs, UTM, `campaignId` | Keep current behavior |
| `dynamicFields` + `dynamicFieldLabels` | All non-mapped Meta keys preserved |
| `clientTimezone` | `ianaFromLeadCountry(leadCountry)` — always set on create |

### CRM qualification (agent)

- `LeadDetails` Holiday vs Visa sections stay as implemented.
- Meta only **prefills**; agent completes required fields before `qualificationCompleted`.

---

## Problem to fix (production evidence)

- UAE visa form `metaFormId: 1607144173711800` saves as `leadType: HOLIDAY` because `metaLeadRouting.rules.js` references wrong form `964456066326392` and `normalizeLeadType(null)` defaults to `HOLIDAY`.
- Most UAE Meta leads have `clientCurrency: null`, `nationality: null` despite Meta answers in `dynamicFields`.

---

## Architecture (must be dynamic)

### 1. Config file (hot-reload optional, git-tracked)

Create `backend/config/meta-qualification-map.json`:

```json
{
  "version": 1,
  "pageDefaults": {
    "1021995967663811": {
      "leadCountry": "India",
      "clientCurrency": "INR",
      "source": "Meta India Page",
      "defaultLeadType": "HOLIDAY",
      "timezone": "Asia/Kolkata"
    },
    "958886697315918": {
      "leadCountry": "United Arab Emirates",
      "clientCurrency": "AED",
      "source": "Meta UAE Page",
      "defaultLeadType": "HOLIDAY",
      "timezone": "Asia/Dubai"
    }
  },
  "formFamilies": [
    {
      "id": "INDIA_PACKAGE",
      "leadType": "HOLIDAY",
      "priority": 10,
      "match": { "signatureAny": ["which_destination_would_you_like_to_visit", "what_is_your_budget_per_person"] },
      "extractors": {
        "destinationName": ["which_destination_would_you_like_to_visit", "which_destinations_are_you_interested_in"],
        "travelPurpose": ["who_will_you_be_travelling_with"],
        "budget": ["what_is_your_budget_per_person"]
      }
    },
    {
      "id": "UAE_MALDIVES",
      "leadType": "HOLIDAY",
      "priority": 10,
      "match": { "signatureAny": ["which_maldives_resort_are_you_interested_in", "what_type_of_maldives_experience_are_you_looking_for"] },
      "extractors": {
        "nationality": ["what_is_your_nationality"],
        "destinationName": ["which_maldives_resort_are_you_interested_in"],
        "travelPurpose": ["what_type_of_maldives_experience_are_you_looking_for"],
        "preferredHotelCategory": ["preferred_stay_experience"],
        "city": ["which_uae_city_will_you_be_travelling_from"]
      }
    },
    {
      "id": "UAE_VISA_ASSISTANCE",
      "leadType": "VISA",
      "priority": 20,
      "match": { "signatureAny": ["which_visa_assistance_are_you_looking_for", "what_is_your_current_monthly_salary_in_the_aed"] },
      "extractors": {
        "nationality": ["what_is_your_nationality"],
        "destinationName": ["which_visa_assistance_are_you_looking_for"],
        "salary": ["what_is_your_current_monthly_salary_in_the_aed"]
      }
    }
  ],
  "valueMaps": {
    "travelPurpose": {
      "couple_vacation": "LEISURE",
      "honeymoon_escape": "HONEYMOON",
      "family_holiday": "FAMILY",
      "friends_&_family": "FAMILY",
      "couple": "LEISURE"
    },
    "preferredHotelCategory": {
      "overwater_villa": "5_STAR",
      "private_pool_villa": "5_STAR",
      "need_expert_recommendation": "ANY"
    },
    "salaryBandsAed": {
      "5000_–_15000_aed": 10000,
      "15000_–_25000_aed": 20000,
      "above_25000_aed": 30000
    },
    "budgetBandsInr": {
      "<_40k": 35000,
      "40k_-_75k": 57500
    }
  },
  "formIdOverrides": {
    "1607144173711800": "UAE_VISA_ASSISTANCE",
    "1424002562747237": "UAE_MALDIVES",
    "35414224904842634": "INDIA_PACKAGE"
  }
}
```

### 2. Mapper module

New: `backend/crm/modules/metaWebhook/metaQualification.mapper.js`

```text
Input:  { pageConfig, metaLead field_data, event }
Output: Partial lead create payload (CRM camelCase)

Steps:
1. flattenMetaFieldData → fields, labels
2. Resolve pageDefaults by metaPageId
3. Resolve family: formIdOverrides[formId] OR highest-priority family where signatureAny matches
4. Apply pageDefaults (leadCountry, clientCurrency, source, timezone)
5. Apply family leadType (overrides page defaultLeadType when family matched)
6. Run extractors → CRM fields via valueMaps
7. Merge dynamicFields = all keys not promoted to CRM columns
8. Never throw on unknown keys; log debug family id
```

### 3. Integrate in `buildLeadPayload`

Replace ad-hoc `leadType: routingRule?.assign?.leadType || null` with mapper output. Keep `metaLeadRouting.rules.js` only for **source** overrides if needed, or merge into config.

### 4. Do NOT break on new ads

- **Never** require `ad_id` / `adset_id` for qualification mapping.
- Optional `formIdOverrides` for fast path only.
- New form with new questions → unmatched family → page default + full `dynamicFields`; ops adds family to JSON.

### 5. API: fetch qualifications for a lead

Extend `GET /api/leads/:id` or add `GET /api/leads/:id/qualification-prefill`:

```json
{
  "canonical": { "leadType", "leadCountry", "clientCurrency", "nationality", "destinationName", ... },
  "meta": { "formFamilyId", "matchedSignatures", "unmappedDynamicKeys" },
  "dynamicFields": {},
  "suggestedAgentQuestions": ["..."]  // from family id + missing canonical fields
}
```

Frontend `LeadDetails` `hydrateQualification` can call this or use embedded lead fields once create mapper runs.

### 6. Backfill script (optional, separate task)

`backend/scripts/backfill-meta-qualification.js`:

- Select `platform = meta` AND (`client_currency IS NULL` OR `lead_type = HOLIDAY` with visa family in `dynamic_fields`)
- Re-run mapper from stored `dynamic_fields` + `meta_page_id` + `meta_form_id`
- Dry-run flag

---

## Value normalizers (implement as pure functions)

| Function | Input example | Output |
|----------|---------------|--------|
| `normalizeMetaSlug` | `hong_kong` | `Hong Kong` |
| `parseSalaryBandAed` | `15000_–_25000_aed` | `20000` |
| `parseBudgetBandInr` | `40k_-_75k` | `57500` |
| `mapTravelPurpose` | `honeymoon_escape` | `HONEYMOON` |
| `mapHotelCategory` | `overwater_villa` | `5_STAR` |
| `parseRelativeTravelWindow` | `within_7_days` | optional ISO date estimate or null + keep raw |

---

## Tests (required)

1. **India package** fixture → `HOLIDAY`, `India`, `INR`, destination from visit key  
2. **UAE Maldives** fixture → `HOLIDAY`, `UAE`, `AED`, nationality, travelPurpose  
3. **UAE visa** fixture (`1607144173711800`) → `VISA`, `AED`, salary, NOT `HOLIDAY`  
4. **Unknown form** on UAE page → `HOLIDAY` default + dynamicFields intact  
5. **Unknown Meta page** → `VISA` default (per business rule)  
6. New ad_id, same form_id → same mapping as 3  

Use fixtures from `docs/meta-lead-qualification-questions.md` §4.

---

## Frontend (minimal)

- No new mandatory UI in v1.
- Ensure `hydrateQualification` uses `toLeadCountryFormValue` for `UAE` / `United Arab Emirates`.
- Show read-only “Meta prefill” chip listing `formFamilyId` when present on lead (optional).

---

## Security & ops

- Config JSON validated with Zod on server boot.
- Invalid family config → log error, fallback to page defaults only.
- Document env vars in `META_WEBHOOK_DEBUG_GUIDE.md` appendix.

---

## Deliverables checklist

- [ ] `backend/config/meta-qualification-map.json`
- [ ] `metaQualification.mapper.js` + unit tests
- [ ] `buildLeadPayload` wired to mapper
- [ ] Remove or fix stale `964456066326392` routing rule
- [ ] `docs/meta-lead-qualification-questions.md` synced if keys change
- [ ] Optional backfill script + runbook one-pager

---

## Out of scope (v1)

- Google Sheet import (`lead_status`, `Second Call` columns) — separate ETL
- Auto `travelDate` from `within_7_days` without product sign-off on date math
- Changing qualification required fields in `LeadDetails` (already done for Holiday/Visa)

---

## Copy-paste one-liner for Canvas

> Implement config-driven Meta qualification mapping per `docs/canvas-prompt-meta-qualification-engine.md` and `docs/meta-lead-qualification-questions.md`: form-family signatures (not ad_id), page defaults for India/UAE (INR/AED, leadCountry, source), extract nationality/destination/travelPurpose/budget/salary from normalized Meta keys, set leadType VISA for UAE visa form family, preserve unmapped fields in dynamicFields, add mapper tests and optional backfill. Do not require deploy when Meta creates new ads on the same form.
