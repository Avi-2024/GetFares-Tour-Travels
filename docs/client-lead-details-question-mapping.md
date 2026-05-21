# CRM Lead Details — Question to Field Mapping (Client Guide)

**Document for:** GetFares sales & marketing teams  
**Purpose:** Shows which Meta Lead Ad questions fill which fields on the **Lead Details** screen in the CRM  
**Last updated:** May 2026  

---

## How to read this guide

When a lead comes from **Meta Lead Ads**, answers are stored in the CRM on the **Lead Details** page (`/leads/{id}`).

That page has **three areas**:

| Area on screen | What it is |
|----------------|------------|
| **1. Lead summary (top)** | Name, phone, email, country, nationality, status — quick read |
| **2. Qualification Capture (form)** | Main trip/visa details agents review and save |
| **3. Custom Fields (button)** | Extra Meta answers that do not have a dedicated CRM field yet |

Some values are **filled automatically** (no question on the form). Agents may complete missing items on a follow-up call.

---

## Automatic fields (not asked on Meta form)

These are set by the system based on **which Meta page** the lead came from:

| CRM field | India Meta page | UAE Meta page |
|-----------|-----------------|---------------|
| Lead country | India | United Arab Emirates |
| Client currency | INR | AED |
| Lead source | Meta India Page | Meta UAE Page |
| Lead type | Holiday *or* Visa (see below) | Holiday *or* Visa (see below) |

**Lead type rules**

| Lead type | When |
|-----------|------|
| **Holiday** | India page leads, and UAE leads from **holiday/package** forms (e.g. Maldives) |
| **Visa** | UAE leads from **visa assistance** forms (UK visa, bank statement, salary in AED, etc.) |

---

# Part A — Holiday leads (India & UAE packages)

## A1. Questions → Lead Details (Holiday)

| # | Question you ask on Meta / on call | Where it appears in CRM | CRM field name |
|---|-----------------------------------|-------------------------|----------------|
| 1 | Full name | Lead summary (top) | Full name |
| 2 | Phone number | Lead summary (top) | Phone |
| 3 | Email address | Lead summary (top) | Email |
| 4 | Which destination would you like to visit? | Qualification → **Destination** | Destination |
| 5 | When are you planning to travel? | Qualification → **Travel start date** | Travel start date |
| 6 | What is your approximate budget per person? | Qualification → **Budget** | Budget |
| 7 | Who will you be travelling with? | Qualification → **Travel purpose** | Travel purpose |
| 8 | What kind of travel experience are you looking for? | Qualification → **Travel purpose** (if #7 empty) | Travel purpose |
| 9 | Preferred stay experience? (e.g. overwater villa) | Qualification → **Preferred hotel category** | Hotel category |
| 10 | Which city will you be travelling from? | Qualification / summary → **City** | City |
| 11 | What is your nationality? | Summary + Qualification → **Nationality** | Nationality |
| 12 | Do you need visa assistance for this trip? | Qualification → **Visa requirement** (Yes/No) | Visa required |
| 13 | How soon are you planning to book? | **Custom Fields** (until promoted) | Booking timeline |
| 14 | Any special requirements? | **Custom Fields** | Special notes |

**Agent completes on call (usually not on Meta form)**

| Item | Where in CRM |
|------|----------------|
| Travel end date | Qualification → Travel end date |
| Number of adults / children / children ages | Qualification |
| PAN (optional) | Finance / Qualification |
| Address | Qualification |
| Campaign (optional) | Qualification → Campaign |

---

## A2. UAE Maldives form (same Holiday type, different wording)

If the ad uses the **Maldives** form, these questions map the same CRM fields:

| Meta question (examples) | CRM field |
|--------------------------|-----------|
| What type of Maldives experience are you looking for? | Travel purpose |
| Which Maldives resort are you interested in? | Destination |
| Which UAE city will you be travelling from? | City |
| How soon are you planning to book? | Custom Fields (booking timeline) |
| What is your nationality? | Nationality |

---

## A3. India package form (extra column)

| Meta question | CRM field |
|---------------|-----------|
| Which destinations are you interested in? (multiple) | Destination |
| How soon are you planning to book your package? | Custom Fields (booking timeline) |

---

# Part B — Visa leads (UAE visa assistance)

## B1. Questions → Lead Details (Visa)

| # | Question you ask on Meta / on call | Where it appears in CRM | CRM field name |
|---|-----------------------------------|-------------------------|----------------|
| 1 | Full name | Lead summary (top) | Full name |
| 2 | Phone number | Lead summary (top) | Phone |
| 3 | Email address | Lead summary (top) | Email |
| 4 | What is your nationality? | Summary + Qualification → **Nationality** | Nationality |
| 5 | Which visa assistance are you looking for? (e.g. UK tourist) | Qualification → **Destination** | Destination / visa product |
| 6 | Which country are you applying visa for? *(if you add this question)* | Qualification → **Destination** | Destination |
| 7 | Do you have 6 months passport validity? | **Custom Fields** | Passport validity |
| 8 | Do you have a valid 6-month bank statement? | **Custom Fields** | Bank statement |
| 9 | What is your current monthly salary in AED? | Qualification → **Salary** | Salary |
| 10 | When are you planning to travel? | Qualification → **Travel start date** (if exact date) or Custom Fields (if “within X days”) | Travel date |
| 11 | Have you faced any previous visa rejection? | **Custom Fields** | Previous rejection |
| 12 | Which UAE city are you currently living in? | Qualification → **City** | City |
| 13 | How urgently do you need visa processing? | **Custom Fields** | Processing urgency |
| 14 | Any additional requirements? | **Custom Fields** | Additional notes |

**Not shown for Visa leads on Qualification form**

Budget, preferred hotel category, travel purpose (holiday-style), and “visa required for trip” are **hidden** — those apply only to **Holiday** leads.

**Automatic for all UAE visa Meta leads**

| Item | Value |
|------|--------|
| Lead country | United Arab Emirates |
| Client currency | AED |
| Lead type | Visa |
| Lead source | Meta UAE Page |

---

# Part C — Visual map (one page)

```
META LEAD AD ANSWERS
        │
        ├─► LEAD SUMMARY (top of page)
        │     • Full name, phone, email
        │     • Lead country (auto from page)
        │     • Nationality (if answered)
        │
        ├─► QUALIFICATION CAPTURE (main form)
        │     Holiday: destination, dates, budget, hotel, travel purpose, visa for trip
        │     Visa: destination/visa type, nationality, salary, city, travel date
        │     Both: lead type, country, currency, source, adults/children (agent)
        │
        └─► CUSTOM FIELDS (button)
              • Booking timeline (“how soon to book”)
              • Passport / bank statement / rejection / urgency (visa)
              • Long resort text, special requirements
              • Anything not listed above
```

---

# Part D — Quick reference by CRM screen label

## Holiday — what fills each label

| Label on Lead Details screen | Filled from question |
|------------------------------|----------------------|
| Full name (top) | Full name |
| Email \| Phone (top) | Email, phone |
| Country (top, blue) | Auto — India or UAE page |
| Nationality (top) | What is your nationality? |
| Lead type | Auto — Holiday |
| Lead country | Auto — India / United Arab Emirates |
| Client currency | Auto — INR / AED |
| Destination | Which destination…? / Maldives resort / multi-destination |
| Travel start date | When are you planning to travel? |
| Travel end date | Agent on call |
| Budget | Budget per person |
| Travel purpose | Travel experience / who travelling with |
| Preferred hotel category | Preferred stay experience |
| City | Which city travelling from |
| Visa requirement | Need visa assistance for this trip? |
| Lead source | Auto — Meta India / Meta UAE Page |
| Custom Fields → “How soon…” | How soon planning to book |

## Visa — what fills each label

| Label on Lead Details screen | Filled from question |
|------------------------------|----------------------|
| Full name (top) | Full name |
| Email \| Phone (top) | Email, phone |
| Country (top) | Auto — United Arab Emirates |
| Nationality | What is your nationality? |
| Lead type | Auto — Visa |
| Client currency | Auto — AED |
| Destination | Which visa assistance…? |
| Salary | Monthly salary in AED |
| City | Which UAE city living in |
| Travel start date | When planning to travel (if exact date) |
| Custom Fields | Passport validity, bank statement, rejection, urgency, extras |

---

# Part E — Meta page reference (for marketing)

| Market | Meta page ID (env) | Default country | Default currency | Typical forms |
|--------|----------------------|-----------------|------------------|---------------|
| India | `1021995967663811` | India | INR | Package / destination |
| UAE | `958886697315918` | United Arab Emirates | AED | Maldives holiday **or** UK/visa assistance |

**Form IDs (reference only — new ads on same form still work)**

| Form | Form ID | Lead type |
|------|---------|-----------|
| India packages | `35414224904842634` | Holiday |
| UAE Maldives | `1424002562747237` | Holiday |
| UAE visa assistance | `1607144173711800` | Visa |

---

# Part F — Notes for client

1. **Relative dates** — If Meta only offers “within 7 days” / “within a month”, that text appears under **Custom Fields** until an agent sets an exact **travel date** on the call.

2. **Budget / salary bands** — Meta may send ranges (e.g. `40k_-_75k`, `15000_–_25000_aed`). CRM stores a parsed number where possible; the original answer remains in Custom Fields.

3. **One lead, one type** — A lead is either **Holiday** or **Visa** on the Qualification form; the CRM shows the relevant fields only.

4. **Sharing this doc** — Safe to share with client; no passwords or internal API paths.

---

**Internal technical docs (for dev team):**  
[`lead-form-questions-stable-keys.md`](./lead-form-questions-stable-keys.md) · [`canvas-prompt-meta-qualification-engine.md`](./canvas-prompt-meta-qualification-engine.md)
