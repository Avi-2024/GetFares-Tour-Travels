# Meta Ads → CRM Lead Details (Simple Guide)

**For:** Client, marketing, sales  
**One page idea:** Meta form answers → show on **Lead Details** in CRM  

---

## 3 rules (remember this)

| # | Rule |
|---|------|
| **1** | **Which Meta page?** → sets **country**, **currency**, **source** (no question needed) |
| **2** | **Which form?** → sets **Holiday** or **Visa** (package form vs visa form) |
| **3** | **Each answer** → goes to **Summary (top)**, **Qualification (form)**, or **Custom Fields (extra button)** |

```
Meta Page (India or UAE)
    → Country + INR/AED + Source (automatic)

Meta Form (Holiday OR Visa)
    → Lead type (automatic)

Each question
    → Summary OR Qualification OR Custom Fields
```

---

## Rule 1 — Meta page (automatic)

| | India page | UAE page |
|---|------------|----------|
| **Lead country** | India | United Arab Emirates |
| **Currency** | INR | AED |
| **Source** | Meta India Page | Meta UAE Page |

Page IDs (reference): India `1021995967663811` · UAE `958886697315918`

---

## Rule 2 — Form ID decides Holiday vs Visa (main dependency)

**Yes — we depend on `form_id`, not ad ID.**

| What changes in Meta | CRM mapping breaks? |
|----------------------|---------------------|
| New **ad** / adset / campaign | **No** — same form ID → same rules |
| New **form** (new form ID) | **Yes** — add one row to table below |
| Same form, reworded questions | **No** — if stable keys stay same |

| Form name | **Form ID** (this is what CRM uses) | Lead type | Market |
|-----------|-------------------------------------|-----------|--------|
| India packages | `35414224904842634` | Holiday | India page |
| UAE Maldives | `1424002562747237` | Holiday | UAE page |
| UAE visa assistance | `1607144173711800` | Visa | UAE page |

**Flow**

```
metaPageId  →  country, currency, source
metaFormId  →  Holiday or Visa + which question map to use
metaAdId    →  ignored for qualification (tracking only)
```

**Do not mix:** Do not put visa questions on a **holiday** form ID (or vice versa).

**New form in future?** Copy questions from the matching row above, keep the same stable keys, tell dev the new `form_id`.

---

## Rule 3 — Where answers appear in CRM

| CRM area | What goes here |
|----------|----------------|
| **Summary (top)** | Name, phone, email, country, nationality |
| **Qualification (main form)** | Main trip or visa details agents work on |
| **Custom Fields (button)** | Extra answers (timeline, yes/no docs, urgency, notes) |

**Agent adds on call (any lead):** travel end date, adults/children/ages, PAN, address, campaign.

---

# Holiday form — questions to use

**Use on:** India page + UAE Maldives/package ads  
**CRM shows:** Budget, hotel, travel purpose — **not** salary  

| Ask on Meta | Shows in CRM as | Area |
|-------------|-----------------|------|
| Full name | Full name | Summary |
| Phone number | Phone | Summary |
| Email | Email | Summary |
| Which destination would you like to visit? | Destination | Qualification |
| When are you planning to travel? | Travel start date *(if “within 7 days” → Custom Fields until agent sets date)* | Qualification / Custom Fields |
| Budget per person? | Budget | Qualification |
| Who will you be travelling with? | Travel purpose | Qualification |
| What kind of travel experience? | Travel purpose *(use one; experience wins if both)* | Qualification |
| Preferred stay experience? | Hotel category | Qualification |
| Which city travelling from? | City | Qualification |
| What is your nationality? | Nationality | Summary + Qualification |
| Need visa help for this trip? | Visa requirement (Yes/No) | Qualification |
| How soon planning to book? | Booking timeline | Custom Fields |
| Special requirements? | Special notes | Custom Fields |

### UAE Maldives — same Holiday type, different words

| Ask on Meta | CRM field |
|-------------|-----------|
| Maldives experience type? | Travel purpose |
| Which Maldives resort? | Destination |
| Which UAE city travelling from? | City |
| How soon to book? | Booking timeline (Custom Fields) |
| Nationality? | Nationality |

### India only — extra questions

| Ask on Meta | CRM field |
|-------------|-----------|
| Multiple destinations interested? | Destination |
| How soon to book your package? | Booking timeline (Custom Fields) |

---

# Visa form — questions to use

**Use on:** UAE page · visa assistance ads only  
**CRM shows:** Salary, visa product — **hides** budget, hotel, holiday travel purpose  

| Ask on Meta | Shows in CRM as | Area |
|-------------|-----------------|------|
| Full name | Full name | Summary |
| Phone | Phone | Summary |
| Email | Email | Summary |
| Nationality? | Nationality | Summary + Qualification |
| Which visa assistance? (e.g. UK tourist) | Destination / visa product | Qualification |
| Which country applying visa for? *(optional)* | Destination | Qualification |
| 6 months passport validity? | Passport validity | Custom Fields |
| Valid 6-month bank statement? | Bank statement | Custom Fields |
| Monthly salary in AED? | Salary | Qualification |
| When planning to travel? | Travel date | Qualification / Custom Fields |
| Previous visa rejection? | Previous rejection | Custom Fields |
| Which UAE city living in? | City | Qualification |
| How urgent is processing? | Processing urgency | Custom Fields |
| Additional requirements? | Additional notes | Custom Fields |

**Always automatic for UAE visa leads:** Country = UAE · Currency = AED · Type = Visa · Source = Meta UAE Page

---

# Stable field keys (for Meta form setup)

Meta turns your question text into these **keys**. Keep wording consistent so keys stay the same.

### Every form (Holiday + Visa)

| # | Key |
|---|-----|
| 1 | `full_name` |
| 2 | `phone_number` |
| 3 | `email` |

### Holiday form only (4–13)

| # | Key |
|---|-----|
| 4 | `which_destination_would_you_like_to_visit` |
| 5 | `when_are_you_planning_to_travel` |
| 6 | `what_is_your_budget_per_person` |
| 7 | `who_will_you_be_travelling_with` |
| 8 | `what_kind_of_travel_experience_are_you_looking_for` |
| 9 | `preferred_stay_experience` |
| 10 | `which_city_will_you_be_travelling_from` |
| 11 | `how_soon_are_you_planning_to_book` |
| 12 | `do_you_need_visa_assistance_for_this_trip` |
| 13 | `what_is_your_nationality` |

**Also use on live UAE/India forms (aliases):**

- `which_maldives_resort_are_you_interested_in` → Destination  
- `what_type_of_maldives_experience_are_you_looking_for` → Travel purpose  
- `which_uae_city_will_you_be_travelling_from` → City  
- `how_soon_are_you_planning_to_book_your_package` → Booking timeline  
- `which_destinations_are_you_interested_in` → Destination  

### Visa form only (14–18 + extras)

| # | Key |
|---|-----|
| 14 | `which_visa_assistance_are_you_looking_for` |
| 15 | `what_is_your_nationality` |
| 16 | `do_you_have_a_valid_6_month_bank_statement` *(live forms may use `…_6_months_…`)* |
| 17 | `do_you_have_6_months_passport_validity` |
| 18 | `what_is_your_current_monthly_salary_in_the_aed` |

**Also use:**

- `have_you_faced_any_previous_visa_rejection`  
- `how_urgently_do_you_need_visa_processing`  
- `any_additional_requirements`  

---

# Cheat sheet — one glance

| You run… | Page ID | **Form ID** | Type | Currency |
|----------|---------|-------------|------|----------|
| India packages | India | `35414224904842634` | Holiday | INR |
| UAE Maldives | UAE | `1424002562747237` | Holiday | AED |
| UAE UK / visa ads | UAE | `1607144173711800` | Visa | AED |

| Question type | Holiday form | Visa form |
|---------------|:------------:|:---------:|
| Destination / resort | ✓ | — |
| Budget | ✓ | — |
| Hotel / experience | ✓ | — |
| Visa for trip (yes/no) | ✓ | — |
| Visa product / UK visa | — | ✓ |
| Salary AED | — | ✓ |
| Bank / passport | — | ✓ |

---

# Today vs after system update

| Doc says | Works fully today? |
|----------|-------------------|
| Name, phone, email | Yes |
| Custom Fields (all Meta extras) | Yes |
| Country INR/AED on new leads | After dev mapper + API restart |
| Visa form → Visa type | After dev mapper |
| Nationality / destination in Qualification | After dev mapper |
| Agent fields (end date, pax) | Yes (manual) |

---

**Technical build:** [`canvas-prompt-meta-qualification-engine.md`](./canvas-prompt-meta-qualification-engine.md)  
**Full key list:** [`lead-form-questions-stable-keys.md`](./lead-form-questions-stable-keys.md)
