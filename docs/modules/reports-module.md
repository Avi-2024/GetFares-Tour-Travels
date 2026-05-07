# Reports module — developer guide

**Location:** `backend/crm/modules/reports`  
**Base URL:** `/api/reports`

**Read-only analytics.** Every endpoint is **`GET`**, gated by **`reports:read`**. The **service** mostly logs and delegates to the **repository**, which runs **PostgreSQL** (`db.query`) aggregations over **`ReportsSchema`** table names (`leads`, `bookings`, `payments`, `quotations`, `users`, `followups`, `visa_cases`, `campaigns`, `destinations`, `suppliers`, `refunds`, `lead_activities`, etc.).

**No writes.** **No emails or notifications** in this module. **`reports.events.js`** exports an **empty** stub (no emitted events). **`index.js`** passes **`events`** into **`createReportsService`**, but the service **does not** use it (safe to ignore).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | One route per report; **`from` / `to`** (and extras) via **query**. |
| **Controller** | Forwards **`req.validated.query`** (or **`req.query`**) + **`req.context`** to **service**. |
| **Service** | **`logger.debug`** per report; **`executiveKpis`** merges **`userId: context.user?.id`** into filters (available to repository if used). |
| **Repository** | **`buildDateRangeClause`**, **`queryRows`** → raw SQL; if **`db.query`** unavailable, **`queryRows`** returns **`[]`**. |

---

## Step-by-step flow

1. **`requireAuth`**.  
2. **`authorize("reports:read")`**.  
3. **`validateRequest`** (Zod; optional **`from`**, **`to`**, report-specific fields).  
4. **Controller** → **service** → **repository** **`db.query`**.  
5. **200** `{ data: ... }` — shape varies by report.

---

## HTTP map → service → repository

| GET path | Service method | Repository method | Intent (short) |
|----------|----------------|-------------------|----------------|
| `/leads/by-source` | `leadsBySource` | `getLeadsBySource` | Leads per **source**; conversion counts |
| `/leads/by-consultant` | `leadsByConsultant` | `getLeadsByConsultant` | Per **user**; optional **`userId`** filter; avg response minutes |
| `/leads/aging` | `leadAging` | `getLeadAgingReport` | Open leads with **age in hours** |
| `/leads/lost` | `lostLeads` | `getLostLeadReport` | Lost leads + reasons |
| `/revenue/monthly` | `revenueByMonth` | `getRevenueByMonth` | Bookings by month: revenue, cost, profit |
| `/revenue/by-service-type` | `revenueByServiceType` | `getRevenueByServiceType` | **HOLIDAY** vs **VISA** (via `visa_cases`) |
| `/revenue/by-destination` | `revenueByDestination` | `getRevenueByDestination` | Revenue via quotation → lead → **destination** |
| `/sales/target-vs-achievement` | `targetVsAchievement` | `getTargetVsAchievement` | **`users.target_amount`** vs booking revenue via quotation creator; optional **`userId`** |
| `/payments/outstanding` | `outstandingPayments` | `getOutstandingPayments` | Bookings where **total − advance > 0** |
| `/payments/mode` | `paymentMode` | `getPaymentModeReport` | Totals by **`payment_mode`** |
| `/profit/margin` | `profitMargin` | `getProfitMarginReport` | Aggregate revenue/cost/margin |
| `/finance/cost-breakup` | `financeCostBreakup` | `getFinanceCostBreakup` | Detailed cost lines (large SQL; supports **`currency`**, **`page`**, **`limit`**) |
| `/finance/supplier-services` | `financeSupplierServices` | `getFinanceSupplierServices` | Supplier/service breakdown (**`supplierId`**, pagination) |
| `/visa/summary` | `visaSummary` | `getVisaSummary` | Visa case stats |
| `/followups/today` | `followupsToday` | `getTodayFollowups` | Optional **`date`** query |
| `/followups/missed` | `followupsMissed` | `getMissedFollowups` | Optional **`date`** |
| `/followups/call-log` | `callLog` | `getCallLogReport` | **`lead_activities`**; optional **`userId`** |
| `/monthly-summary` | `monthlySummary` | `getMonthlySummary` | Cross **all-time** lead stats with **date-filtered** booking stats |
| `/dashboard/executive-kpis` | `executiveKpis` | `getExecutiveKpis` | Multi-query pack: leads, bookings, refunds turnaround, followups, active agents, holiday/visa split |
| `/funnel/conversion` | `conversionFunnel` | `getConversionFunnel` | Counts by **lead status** |
| `/marketing/performance` | `marketingPerformance` | `getMarketingPerformance` | Campaign-related metrics |
| `/suppliers/performance` | `supplierPerformance` | `getSupplierPerformance` | Supplier stats; optional **`supplierId`** |
| `/forecast/pipeline` | `pipelineForecast` | `getPipelineForecast` | Optional **`periodMonths` (1–12)** |

---

## Function-wise explanation

### Controller

Each handler calls the matching **service** method with **`(query, context)`** and returns **`{ data: result }`** with **200**.

### Service

| Method | Behavior |
|--------|----------|
| All except **`executiveKpis`** | **`logger.debug`** + single **repository** call. |
| **`executiveKpis`** | Adds **`userId: context.user?.id`** to filters (for future scoping; repository may or may not use it in SQL). |

### Repository (shared helpers)

| Helper | Purpose |
|--------|---------|
| **`buildDateRangeClause(column, filters)`** | Adds **`column >= $from`** and **`column <= $to`** when **`filters.from`** / **`filters.to`** set. |
| **`queryRows`** | Uses **`db.query`**; if no raw query support, returns **`[]`** (empty reports). |

### Repository (reports — conceptual)

- **Leads:** grouping, conversion = **`status = 'CONVERTED'`**, response time from **`response_at - created_at`**.  
- **Revenue:** **`bookings`** **`total_amount`**, **`cost_amount`**, profit = difference.  
- **Destination:** join **booking → quotation → lead → destination**.  
- **Target vs achievement:** **`users`** joined to **quotations** created by user and **bookings** on those quotations.  
- **Executive KPIs:** several queries (bookings, leads, service split, followups table, active users, refunds avg days **processed_at − created_at**).  
- **Monthly summary:** **`lead_stats`** is **unfiltered** total leads in DB; **`booking_stats`** uses date range — **be aware** when interpreting **conversionRatePercent**.

---

## Input → processing → output

| Input | Processing | Output |
|--------|------------|--------|
| Query **`from`**, **`to`** (ISO strings) | SQL filters on relevant **`created_at`** (or per-report column) | Arrays or objects of metrics |
| **`userId`** (UUID) where allowed | Extra **`WHERE`** for consultant / call log / target reports | Filtered rows |
| **`date`** (follow-ups) | Day-specific follow-up queries | Lists |
| **`currency`**, **`page`**, **`limit`** (finance) | Pagination / filter in finance SQL | Paged or filtered rows |

---

## Business logic (simple terms)

- Reports answer **“how many / how much / how fast”** for leads, bookings, payments, visa, follow-ups, suppliers, marketing.  
- **Dates** usually filter **booking** or **lead** **created_at**; exact column is per report (see repository).  
- **Service type** **HOLIDAY vs VISA** is inferred: booking **with** a **visa_case** row → **VISA**, else **HOLIDAY**.  
- **Outstanding** = booking **total** minus **advance_received** > 0.  
- **Executive KPIs** bundle **high-level** numbers for dashboards.

---

## Database operations

**Only `SELECT`** (aggregations, joins, CTEs). **No INSERT/UPDATE/DELETE** in this module.

---

## Validations and conditions

- **`from` / `to`:** optional strings (Zod does not enforce ISO format strictly; repository passes to SQL).  
- **`userId`**, **`supplierId`:** optional UUIDs where schema extends.  
- **`followups`:** optional **`date`**.  
- **`pipelineForecast`:** optional **`periodMonths`** 1–12.  
- **`finance`:** **`page`**, **`limit`** (limit capped at **200** in validation).

---

## Side effects

| Kind | Details |
|------|---------|
| **Email / notifications** | **None**. |
| **Events** | **None** (empty **`createReportsEvents`**). |
| **DB** | **Read-only**. |

---

## Example API request/response

**Revenue by month** — `GET /api/reports/revenue/monthly?from=2026-01-01&to=2026-12-31`  
Headers: `Authorization: Bearer <token>`

```json
{
  "data": [
    {
      "month": "2026-01",
      "revenue": 125000.5,
      "cost": 98000,
      "profit": 27000.5
    }
  ]
}
```

**Executive KPIs** — `GET /api/reports/dashboard/executive-kpis?from=2026-04-01&to=2026-04-30`

```json
{
  "data": {
    "totalLeads": 120,
    "convertedLeads": 18,
    "conversionRatePercent": 15,
    "totalBookings": 42,
    "revenue": 500000,
    "cost": 380000,
    "profit": 120000,
    "avgBookingValue": 11904.76,
    "avgMarginPercent": 24,
    "cancellationRatioPercent": 2.5,
    "activeAgents": 8,
    "pendingFollowups": 15,
    "overdueFollowups": 3,
    "refundTurnaroundDaysAvg": 4.2,
    "holidayRevenue": 400000,
    "visaRevenue": 100000
  }
}
```

(Exact fields depend on DB data; empty SQL adapter returns **empty arrays** / **zeros**.)

---

## Notes for developers

- **`canUseRawQuery()`** must be **true** or all reports return **empty** — needs **`db.query`** + **`db.pool`**.  
- **`monthlySummary`** mixes **global** lead totals with **range-scoped** booking stats — document clearly to users or adjust product expectations.  
- **PostgreSQL-specific** SQL (**`TO_CHAR`**, **`DATE_TRUNC`**, **`uuid[]`**) — other DB adapters are not fully supported here.  
- For **refund** business rules (create/approve/process), see **`docs/modules/refunds-module.md`**.  
- **`reports:read`** must exist in **`permissions`** for users who should run analytics.
