# Meta Lead Qualification — Standard Questions & Field Mapping

**Status:** Planning only (no code yet)  
**Goal:** One qualification model for **Holiday** and **Visa**, fed by Meta Lead Ads, Google Sheet exports, and manual CRM capture — without breaking when ads/forms change.

> **Canonical question list for Meta + CRM:** see [`lead-form-questions-stable-keys.md`](./lead-form-questions-stable-keys.md) (numbered Holiday/Visa questions + master stable keys).

---

## 1. Design principles (dynamic, ad-safe)

| Principle | Why |
|-----------|-----|
| Map by **semantic field keys**, not raw Meta question text | Meta renames labels; normalized keys stay stable (`normalizeFieldKey` in `leadFields.utils.js`) |
| Detect **form family** by **field signature** (which keys exist), not only `form_id` | New ad = new `ad_id`; same form = same keys |
| Keep **unknown fields** in `dynamicFields` | Never drop data when Meta adds questions |
| **Page config** drives market: `leadCountry`, default `clientCurrency`, `leadSource`, timezone | `META_INDIA_PAGE_ID`, `META_UAE_PAGE_ID` in `.env` |
| **CRM qualification** fields are canonical; Meta only **prefills** | Agent can correct on `LeadDetails` before `qualificationCompleted` |

---

## 2. Canonical CRM qualification fields

These are what the backend/API already supports (see `LeadDetails` / `leads.validation.js`).

| CRM field | Holiday | Visa | Auto from Meta? |
|-----------|---------|------|-----------------|
| `fullName` | ✓ | ✓ | ✓ `full_name` |
| `phone` | ✓ | ✓ | ✓ `phone_number` |
| `email` | ✓ | ✓ | ✓ `email` |
| `city` | ✓ | optional | ✓ `city` (India forms) |
| `leadType` | `HOLIDAY` | `VISA` | ✓ rules (§4) |
| `leadCountry` | ✓ | ✓ | ✓ page config |
| `nationality` | ✓ | ✓ | ✓ `what_is_your_nationality` |
| `clientCurrency` | ✓ | ✓ | ✓ rules (§5) |
| `destinationName` / `travelTo` | ✓ | optional | ✓ destination keys (§6) |
| `travelDate` | ✓ | optional | partial (relative Meta answers) |
| `travelEndDate` | ✓ | optional | manual / follow-up |
| `adultsCount` / `childrenCount` / `childAges` | ✓ | rare | manual |
| `budget` | ✓ | — | ✓ India budget keys |
| `salary` | — | ✓ | ✓ UAE salary-in-AED keys |
| `visaRequired` | ✓ (holiday trip) | — | infer or manual |
| `preferredHotelCategory` | ✓ | — | partial from `preferred_stay_experience` |
| `travelPurpose` | ✓ | — | ✓ experience / travelling-with keys |
| `leadSource` / `source` | ✓ | ✓ | ✓ page `sourceLabel` |
| `campaignId` / UTM / Meta IDs | ✓ | ✓ | ✓ webhook |
| `dynamicFields` + `dynamicFieldLabels` | ✓ | ✓ | ✓ all non-fixed Meta keys |

---

## 3. Standard agent questions (phone / qualification call)

Use when Meta did not fill CRM fields or answers are vague (`within_7_days`, `40k_-_75k`).

### 3.1 Holiday (packages / Maldives / outbound from India or UAE)

**Identity & contact** (usually already from Meta)

1. Confirm full name spelling?
2. Best phone / WhatsApp? Email correct?
3. City / departure city?

**Trip intent**

4. Where do you want to travel? (destination)
5. Travel start date and return date?
6. How many adults and children? Children ages?
7. Who are you travelling with? (couple / family / friends — maps to `travelPurpose`)
8. What kind of trip? (honeymoon, family holiday, adventure — maps to `travelPurpose`)
9. Preferred hotel category? (3★ / 4★ / 5★ / any)
10. Rough budget in **client currency**? (total or per person)
11. Do you need visa assistance for this trip? (yes/no)

**CRM market**

12. Confirm nationality?
13. Confirm lead country (India / UAE — where customer is based for this sale)?

**Close**

14. How soon do you want to book? (exploring / week / month)
15. Any must-haves? (resort name, overwater villa, flights included)

### 3.2 Visa (assistance from UAE — UK, Schengen, etc.)

**Identity**

1. Confirm name, phone, email?
2. Nationality? Passport country?
3. Current UAE city / emirate?

**Visa case**

4. Which visa are you applying for? (country + type — maps destination / case type in `dynamicFields`)
5. Passport valid 6+ months? (yes/no)
6. Valid 6-month bank statement available? (yes/no)
7. Monthly salary range in AED? (maps `salary` band)
8. Travel date if known? Purpose of visit?
9. Any previous refusals or active applications?

**CRM market**

10. Lead country = UAE (page-based) — confirm?
11. Client currency = AED unless exception?

**Close**

12. Documents ready timeline?
13. Urgent or standard processing expectation?

---

## 4. Your live Meta forms (from Google Sheet / production data)

### 4.1 India — Holiday / packages (`META_INDIA_PAGE_ID`)

**Typical `form_id`:** `35414224904842634`  
**Form family signature:** `which_destination_would_you_like_to_visit` OR `which_destinations_are_you_interested`

| Meta / Sheet column | Normalized key | Maps to CRM |
|---------------------|----------------|-------------|
| `full_name` | `full_name` | `fullName` |
| `email` | `email` | `email` |
| `phone_number` | `phone_number` | `phone` |
| `city` | `city` | `city` |
| `which_destination_would_you_like_to_visit?` | `which_destination_would_you_like_to_visit` | `destinationName`, `travelTo` |
| `which_destinations_are_you_interested_in?_(you_can_mention_multiple)` | `which_destinations_are_you_interested_in_*` | `destinationName` (first / joined) |
| `who_will_you_be_travelling_with?` | `who_will_you_be_travelling_with` | `travelPurpose` (enum map) |
| `how_soon_are_you_planning_to_book_your_package?` | `how_soon_are_you_planning_to_book_your_package` | `dynamicFields` + follow-up priority |
| `what_is_your_budget_per_person?` | `what_is_your_budget_per_person` | `budget` (parse band → number) |
| `ad_id`, `campaign_id`, `form_id`, … | meta columns | attribution only |

**Auto assignment**

| Field | Value |
|-------|--------|
| `leadType` | `HOLIDAY` |
| `leadCountry` | `India` |
| `clientCurrency` | `INR` (page default; see §5) |
| `source` | `Meta India Page` |

---

### 4.2 UAE — Maldives / holiday (`META_UAE_PAGE_ID`)

**Typical `form_id`:** `1424002562747237`  
**Form family signature:** `which_maldives_resort_are_you_interested_in` OR `what_type_of_maldives_experience_are_you_looking_for`

| Meta / Sheet column | Normalized key | Maps to CRM |
|---------------------|----------------|-------------|
| `full_name` | `full_name` | `fullName` |
| `email` | `email` | `email` |
| `phone_number` | `phone_number` | `phone` |
| `what_is_your_nationality?` | `what_is_your_nationality` | `nationality` |
| `what_type_of_maldives_experience_are_you_looking_for?` | `what_type_of_maldives_experience_are_you_looking_for` | `travelPurpose` |
| `when_are_you_planning_to_travel?` | `when_are_you_planning_to_travel` | `dynamicFields` → optional `travelDate` estimate |
| `how_soon_are_you_planning_to_book?` | `how_soon_are_you_planning_to_book` | priority / `dynamicFields` |
| `which_maldives_resort_are_you_interested_in?` | `which_maldives_resort_are_you_interested_in` | `destinationName` (resort/product) |
| `which_uae_city_will_you_be_travelling_from?` | `which_uae_city_will_you_be_travelling_from` | `city` or `addressLine` hint |
| `preferred_stay_experience?` | `preferred_stay_experience` | `preferredHotelCategory` (enum map) |

**Auto assignment**

| Field | Value |
|-------|--------|
| `leadType` | `HOLIDAY` |
| `leadCountry` | `United Arab Emirates` |
| `clientCurrency` | `AED` |
| `source` | `Meta UAE Page` |

---

### 4.3 UAE — Visa assistance (`META_UAE_PAGE_ID`)

**Typical `form_id`:** `1607144173711800`  
**Form family signature:** `which_visa_assistance_are_you_looking_for` OR `what_is_your_current_monthly_salary_in_the_aed`

| Meta / Sheet column | Normalized key | Maps to CRM |
|---------------------|----------------|-------------|
| `full_name` | `full_name` | `fullName` |
| `email` | `email` | `email` |
| `phone_number` | `phone_number` | `phone` |
| `what_is_your_nationality?` | `what_is_your_nationality` | `nationality` |
| `which_visa_assistance_are_you_looking_for?` | `which_visa_assistance_are_you_looking_for` | `destinationName` / visa product + `dynamicFields` |
| `do_you_have_6_months_of_passport_validity?` | `do_you_have_6_months_of_passport_validity` | `dynamicFields` |
| `do_you_have_a_valid_6-months_bank_statement?` | `do_you_have_a_valid_6_months_bank_statement` | `dynamicFields` |
| `what_is_your_current_monthly_salary_in_the_aed?` | `what_is_your_current_monthly_salary_in_the_aed` | `salary` (band parser) |

**Auto assignment**

| Field | Value |
|-------|--------|
| `leadType` | `VISA` |
| `leadCountry` | `United Arab Emirates` |
| `clientCurrency` | `AED` |
| `source` | `Meta UAE Page` (or `Getfares` if campaign-specific) |

---

## 5. Auto rules — currency, country, source, lead type

### 5.1 `leadCountry` (primary: Meta page, not nationality)

| `metaPageId` | `leadCountry` |
|--------------|---------------|
| `META_INDIA_PAGE_ID` (`1021995967663811`) | `India` |
| `META_UAE_PAGE_ID` (`958886697315918`) | `United Arab Emirates` |
| Other / unknown Meta page | null → manual |
| Non-Meta (`WalkIn`, `Phone`, …) | manual |

Nationality answers **where the customer is from**; lead country is **which market/office owns the sale** (India desk vs UAE desk).

### 5.2 `clientCurrency` (priority order)

1. **Page market default:** India page → `INR`, UAE page → `AED`
2. **Optional nationality override** (only if you enable later): e.g. Indian national on UAE page still quotes in **AED** for UAE desk — recommend **do not override** page currency for Meta UAE leads
3. Manual on qualification save

### 5.3 `leadType` (recommended: form family, not page-only)

| Detection | `leadType` |
|-----------|------------|
| Form has visa signature keys (`which_visa_assistance_are_you_looking_for`, salary-in-AED key) | `VISA` |
| Form has holiday/package signature keys (destination visit, Maldives resort, India budget-per-person) | `HOLIDAY` |
| `metaPageId` = India or UAE page and no signature match | `HOLIDAY` (default for your two pages) |
| Meta from **other** pages | `VISA` until configured |
| Non-Meta | agent selects |

This fixes today’s bug: visa form `1607144173711800` must not fall through to `normalizeLeadType(null)` → `HOLIDAY`.

### 5.4 `leadSource`

| Source | `source` value |
|--------|----------------|
| India Meta page config | `Meta India Page` |
| UAE Meta page config | `Meta UAE Page` |
| Routing rule override | e.g. `Getfares` |
| Manual CRM | `Phone`, `WalkIn`, `Website`, … |

### 5.5 `travelPurpose` (value normalizers)

| Meta raw (examples) | CRM `travelPurpose` |
|---------------------|---------------------|
| `couple_vacation`, `honeymoon_escape` | `HONEYMOON` or `LEISURE` |
| `family_holiday` | `FAMILY` |
| `friends_&_family`, `couple` | `FAMILY` / `LEISURE` |
| `adventure` | `ADVENTURE` |
| `business` (if added) | `BUSINESS` |

Store raw in `dynamicFields`; mapped enum in `travelPurpose`.

### 5.6 `preferredHotelCategory` (from Maldives stay)

| Meta `preferred_stay_experience` | CRM |
|----------------------------------|-----|
| `overwater_villa`, `private_pool_villa` | `5_STAR` or `ANY` |
| `need_expert_recommendation` | `ANY` |
| (config table, not hardcoded in code strings) | |

### 5.7 `budget` / `salary` parsers (bands)

| Meta band | Holiday `budget` | Visa `salary` |
|-----------|------------------|---------------|
| `40k_-_75k`, `<_40k` (India INR context) | parse mid-point INR | — |
| `5000_–_15000_aed`, `15000_–_25000_aed`, `above_25000_aed` | — | store numeric mid + keep raw in `dynamicFields` |

---

## 6. Form family registry (config-driven — change ads without deploy)

Proposed JSON config (future): `backend/config/meta-form-families.json`

```json
{
  "pageDefaults": {
    "1021995967663811": {
      "market": "INDIA",
      "leadCountry": "India",
      "clientCurrency": "INR",
      "source": "Meta India Page",
      "defaultLeadType": "HOLIDAY"
    },
    "958886697315918": {
      "market": "UAE",
      "leadCountry": "United Arab Emirates",
      "clientCurrency": "AED",
      "source": "Meta UAE Page",
      "defaultLeadType": "HOLIDAY"
    }
  },
  "families": [
    {
      "id": "INDIA_PACKAGE_LEAD",
      "leadType": "HOLIDAY",
      "signatureAny": [
        "which_destination_would_you_like_to_visit",
        "what_is_your_budget_per_person"
      ],
      "mappings": { }
    },
    {
      "id": "UAE_MALDIVES_LEAD",
      "leadType": "HOLIDAY",
      "signatureAny": [
        "which_maldives_resort_are_you_interested_in",
        "what_type_of_maldives_experience_are_you_looking_for"
      ],
      "mappings": { }
    },
    {
      "id": "UAE_VISA_ASSISTANCE_LEAD",
      "leadType": "VISA",
      "signatureAny": [
        "which_visa_assistance_are_you_looking_for",
        "what_is_your_current_monthly_salary_in_the_aed"
      ],
      "mappings": { }
    }
  ]
}
```

**Matching order:** exact `form_id` override (optional) → family `signatureAny` → page `defaultLeadType`.

---

## 7. What stays in `dynamicFields` only (do not lose)

- `how_soon_are_you_planning_to_book*`
- `when_are_you_planning_to_travel`
- `which_maldives_resort_are_you_interested_in` (full marketing string with AED price)
- Passport / bank statement yes/no
- `lead_status`, sheet columns (`date- 20/04/26`, `Second Call`) — **not** Meta webhook; import separately if needed

---

## 8. Gap list vs your current production JSON

From your live leads list (May 2026):

| Issue | Cause | Doc fix |
|-------|-------|---------|
| Visa form leads show `leadType: HOLIDAY` | Wrong routing form id + `normalizeLeadType(null)` default | §5.3 form family |
| `clientCurrency: null` on UAE Meta | Prefill not applied on create / old leads | §5.2 page default on webhook |
| `leadCountry: UAE` not full name | Old storage; UI expects `United Arab Emirates` | §5.1 |
| `nationality: null` though Meta has it | Not mapped on create | map `what_is_your_nationality` |
| `travelPurpose` empty | Not mapped from experience keys | §5.5 |
| India lead on UAE page (Indian national, Maldives) | Correct: UAE market, AED | §5.1–5.2 |

---

## 9. Related files (when you implement)

| Area | Path |
|------|------|
| Meta payload build | `backend/crm/modules/metaWebhook/metaLead.service.js` |
| Routing rules (today) | `backend/crm/modules/metaWebhook/metaLeadRouting.rules.js` |
| Field normalize | `backend/crm/modules/leads/leadFields.utils.js` |
| CRM qualification UI | `crm-frontend/src/pages/leads/LeadDetails.tsx` |
| Country display | `crm-frontend/src/utils/leadCountry.ts` |

---

## 10. Next step

Read **`docs/canvas-prompt-meta-qualification-engine.md`** for the implementation prompt (config schema, API shape, acceptance tests). No code until you approve that canvas.
