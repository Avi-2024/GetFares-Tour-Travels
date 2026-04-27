# Campaign Meta Phase 1

## Goal

- Show Meta-only data first.
- Avoid fake business numbers.
- Keep CRM revenue later.

## Meta fields used

From lead webhook:

- `campaign_id`
- `adset_id`
- `ad_id`
- `page_id`
- `leadgen_id`

From campaign object:

- `id`
- `name`
- `status`
- `effective_status`
- `daily_budget`
- `lifetime_budget`
- `objective`
- `start_time`
- `stop_time`

From campaign insights:

- `spend`
- `impressions`
- `reach`
- `clicks`
- `ctr`
- `cpc`
- `cpm`
- `actions`

## Phase 1 numbers

Show these as real Meta data:

- Campaign name
- Meta campaign id
- Country
- Budget
- Spend
- Start date
- End date
- Lead count from Meta actions

## Not Meta in phase 1

Do not treat these as Meta:

- CRM revenue
- Bookings
- Qualified leads
- ROAS
- ROI

These need CRM joins later.

## Current save behavior

- `campaigns.meta_campaign_id` real
- `campaigns.name` from Meta
- `campaigns.budget` from Meta budget
- `campaigns.actual_spend` from Meta insights spend
- `campaigns.leads_generated` from Meta lead actions
- `campaigns.start_date` from Meta start time
- `campaigns.end_date` from Meta stop time

## Business note

- Budget and spend are Meta truth.
- Revenue is CRM truth.
- ROI before CRM sync is misleading.
