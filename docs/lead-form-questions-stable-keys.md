# Lead Form Questions — CRM & Meta Ads (Stable Keys)

> **Client-friendly version (share externally):** [`client-lead-details-question-mapping.md`](./client-lead-details-question-mapping.md)

Use this as the **single source of truth** when building Meta Lead Ads and CRM qualification.  
Meta question text can change; **stable keys** must stay the same (CRM normalizes labels to these keys).

**Normalization rule:** lowercase, `?` removed, spaces/special chars → `_` (see `leadFields.utils.js` → `normalizeFieldKey`).

---

## Fixed contact fields (all forms)

| # | Question (show in Meta / CRM) | Stable key | CRM field |
|---|--------------------------------|------------|-----------|
| — | Full name | `full_name` | `fullName` |
| — | Phone number | `phone_number` | `phone` |
| — | Email | `email` | `email` |
| — | City | `city` | `city` |

---

# Holiday lead form (India / UAE packages)

Use for **India page** (`META_INDIA_PAGE_ID`) and **UAE holiday forms** (e.g. Maldives).  
**CRM `leadType`:** `HOLIDAY`  
**Default `leadCountry`:** India page → `India` · UAE page → `United Arab Emirates`  
**Default `clientCurrency`:** `INR` / `AED`

| # | Question (Meta / agent script) | Stable key | CRM field | Required |
|---|--------------------------------|------------|-----------|----------|
| 1 | Which destination would you like to visit? | `which_destination_would_you_like_to_visit` | `destinationName` | Yes |
| 2 | When are you planning to travel? | `when_are_you_planning_to_travel` | `travelDate` (or `dynamicFields` if relative answer) | Yes |
| 3 | What is your approximate budget per person? | `what_is_your_budget_per_person` | `budget` | Yes |
| 4 | Who will you be travelling with? | `who_will_you_be_travelling_with` | `travelPurpose` | Yes |
| 5 | What kind of travel experience are you looking for? | `what_kind_of_travel_experience_are_you_looking_for` | `travelPurpose` | Yes |
| 6 | Preferred stay experience? | `preferred_stay_experience` | `preferredHotelCategory` | Yes |
| 7 | Which city will you be travelling from? | `which_city_will_you_be_travelling_from` | `city` | Recommended |
| 8 | How soon are you planning to book? | `how_soon_are_you_planning_to_book` | `dynamicFields` (priority) | Recommended |
| 9 | Do you need visa assistance for this trip? | `do_you_need_visa_assistance_for_this_trip` | `visaRequired` | Recommended |
| 10 | Any special requirements? | `any_special_requirements` | `dynamicFields` / notes | Optional |

### Holiday — optional / multi-destination (India)

| Question | Stable key | CRM |
|----------|------------|-----|
| Which destinations are you interested in? (you can mention multiple) | `which_destinations_are_you_interested_in` | `destinationName` (first or combined) |

### Holiday — UAE Maldives (live form today)

Same holiday type; you may use these **instead of or in addition to** #1–6 above on UAE ads:

| # | Question (Meta) | Stable key | CRM field |
|---|-----------------|------------|-----------|
| 1b | What type of Maldives experience are you looking for? | `what_type_of_maldives_experience_are_you_looking_for` | `travelPurpose` |
| 2b | Which Maldives resort are you interested in? | `which_maldives_resort_are_you_interested_in` | `destinationName` |
| 7b | Which UAE city will you be travelling from? | `which_uae_city_will_you_be_travelling_from` | `city` |
| 8b | How soon are you planning to book? | `how_soon_are_you_planning_to_book` | `dynamicFields` |

**Alias rule for mapper:** treat `what_kind_of_travel_experience_are_you_looking_for` and `what_type_of_maldives_experience_are_you_looking_for` as the same semantic → `travelPurpose`.  
Treat `which_city_will_you_be_travelling_from` and `which_uae_city_will_you_be_travelling_from` as the same semantic → `city`.

### Holiday — suggested answer options (Meta dropdowns)

**`who_will_you_be_travelling_with` / experience**

- `couple` → CRM `travelPurpose`: `LEISURE`
- `family` / `friends_&_family` → `FAMILY`
- `honeymoon_escape` / `couple_vacation` → `HONEYMOON`
- `solo` → `LEISURE`

**`preferred_stay_experience`**

- `overwater_villa` / `private_pool_villa` → `5_STAR`
- `need_expert_recommendation` → `ANY`

**`what_is_your_budget_per_person` (India)**

- `<_40k` · `40k_-_75k` · `75k_+` → parse to INR number in `budget`

**`when_are_you_planning_to_travel`**

- `within_7_days` · `within_15_days` · `within_30_days` · `later` → keep raw in `dynamicFields`; agent sets exact `travelDate` on call

**`do_you_need_visa_assistance_for_this_trip`**

- `yes` / `no` → `visaRequired`: true / false

---

# UAE visa lead form

Use on **UAE page** (`META_UAE_PAGE_ID`) for visa assistance ads.  
**CRM `leadType`:** `VISA`  
**Default `leadCountry`:** `United Arab Emirates`  
**Default `clientCurrency`:** `AED`

| # | Question (Meta / agent script) | Stable key | CRM field | Required |
|---|--------------------------------|------------|-----------|----------|
| 1 | Which visa assistance are you looking for? | `which_visa_assistance_are_you_looking_for` | `destinationName` + `dynamicFields` | Yes |
| 2 | What is your nationality? | `what_is_your_nationality` | `nationality` | Yes |
| 3 | Do you have a valid 6-month bank statement? | `do_you_have_a_valid_6_month_bank_statement` | `dynamicFields` | Yes |
| 4 | Do you have 6 months passport validity? | `do_you_have_6_months_passport_validity` | `dynamicFields` | Yes |
| 5 | What is your current monthly salary in AED? | `what_is_your_current_monthly_salary_in_the_aed` | `salary` | Yes |
| 6 | When are you planning to travel? | `when_are_you_planning_to_travel` | `travelDate` / `dynamicFields` | Recommended |
| 7 | Have you faced any previous visa rejection? | `have_you_faced_any_previous_visa_rejection` | `dynamicFields` | Recommended |
| 8 | Which UAE city are you currently living in? | `which_uae_city_are_you_currently_living_in` | `city` | Recommended |
| 9 | How urgently do you need visa processing? | `how_urgently_do_you_need_visa_processing` | `dynamicFields` | Recommended |
| 10 | Any additional requirements? | `any_additional_requirements` | `dynamicFields` / notes | Optional |

### Visa — legacy keys (already in production webhooks)

Mapper must accept these **aliases** (same meaning as your stable keys):

| Your stable key | Production alias (keep working) |
|-----------------|----------------------------------|
| `do_you_have_a_valid_6_month_bank_statement` | `do_you_have_a_valid_6_months_bank_statement` |
| `which_uae_city_are_you_currently_living_in` | _(often only nationality + salary on form; use `city` from contact if missing)_ |

### Visa — suggested answer options

**`which_visa_assistance_are_you_looking_for`**

- `uk_tourist_visa` · `schengen_visa` · `us_visa` → display label on lead; map country in `destinationName`

**`what_is_your_current_monthly_salary_in_the_aed`**

- `5000_–_15000_aed` → `10000`
- `15000_–_25000_aed` → `20000`
- `above_25000_aed` → `30000`

**`do_you_have_a_valid_6_month_bank_statement` / passport validity**

- `yes` / `no`

**`how_urgently_do_you_need_visa_processing`**

- `urgent` · `within_1_week` · `standard` · `not_sure`

---

# Master list — recommended stable keys

Copy into Meta form builder (custom questions → internal name if Meta allows; otherwise match question wording so normalization hits the same key).

### Contact

- `full_name`
- `phone_number`
- `email`
- `city`

### Holiday only

- `which_destination_would_you_like_to_visit`
- `which_destinations_are_you_interested_in` _(India multi-dest)_
- `when_are_you_planning_to_travel`
- `what_is_your_budget_per_person`
- `who_will_you_be_travelling_with`
- `what_kind_of_travel_experience_are_you_looking_for`
- `what_type_of_maldives_experience_are_you_looking_for` _(UAE Maldives alias)_
- `preferred_stay_experience`
- `which_city_will_you_be_travelling_from`
- `which_uae_city_will_you_be_travelling_from` _(UAE alias)_
- `which_maldives_resort_are_you_interested_in` _(UAE Maldives)_
- `how_soon_are_you_planning_to_book`
- `how_soon_are_you_planning_to_book_your_package` _(India alias)_
- `do_you_need_visa_assistance_for_this_trip`
- `any_special_requirements`

### Visa only

- `which_visa_assistance_are_you_looking_for`
- `what_is_your_nationality`
- `do_you_have_a_valid_6_month_bank_statement`
- `do_you_have_a_valid_6_months_bank_statement` _(legacy alias)_
- `do_you_have_6_months_passport_validity`
- `what_is_your_current_monthly_salary_in_the_aed`
- `have_you_faced_any_previous_visa_rejection`
- `which_uae_city_are_you_currently_living_in`
- `how_urgently_do_you_need_visa_processing`
- `any_additional_requirements`

---

# Auto-assigned CRM fields (not Meta questions)

Set by system on webhook create — **do not** add as Meta form questions:

| CRM field | Rule |
|-----------|------|
| `leadType` | Holiday family → `HOLIDAY` · Visa family → `VISA` |
| `leadCountry` | India page → `India` · UAE page → `United Arab Emirates` |
| `clientCurrency` | India → `INR` · UAE → `AED` |
| `source` | `Meta India Page` / `Meta UAE Page` |
| `platform` | `meta` |
| `metaPageId`, `metaFormId`, `metaLeadId`, campaign/ad IDs | Webhook |

---

# Form IDs (reference — override in config, not required for mapping)

| Form | `form_id` | Type |
|------|-----------|------|
| India packages | `35414224904842634` | Holiday |
| UAE Maldives | `1424002562747237` | Holiday |
| UAE visa assistance | `1607144173711800` | Visa |

New ad → same `form_id` → mapping unchanged.

---

# CRM qualification (agent — after Meta prefill)

Fields agents still complete on **Lead Details** if Meta did not fill or answer was a band/slug:

| Holiday | Visa |
|---------|------|
| Travel end date | — |
| Adults / children / ages | — |
| Preferred hotel category (if Meta stay type unclear) | — |
| Budget (if band only) | Salary (if band only) |
| Travel purpose enum | — |
| PAN (optional) | PAN (optional) |
| Address | Address (optional) |
| Campaign (optional) | Campaign (optional) |

---

# Checklist before publishing a new Meta form

1. Question wording can change; **stable key** must match this doc after normalization.  
2. Pick **Holiday** or **Visa** question set — do not mix visa salary question on holiday form.  
3. Include `full_name`, `phone_number`, `email`.  
4. Test one lead → check CRM: `leadType`, `leadCountry`, `clientCurrency`, `nationality`, `destinationName`, `dynamicFields`.  
5. Add new keys to `meta-qualification-map.json` when implementing mapper (see `docs/canvas-prompt-meta-qualification-engine.md`).

---

**Related:** `docs/meta-lead-qualification-questions.md` · `docs/canvas-prompt-meta-qualification-engine.md`
