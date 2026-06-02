# CRM Reports API Reference

Base URL: `/api/reports`

Auth: all endpoints require logged-in user and `reports:read` permission.

Common query filters:

| Query | Type | Use |
| --- | --- | --- |
| `from` | date string | Start date filter. |
| `to` | date string | End date filter. |
| `userId` | UUID | Consultant / user scoped report. |
| `role` | string | Role scoped report. |
| `supplierId` | UUID | Supplier scoped report where supported. |
| `destination` | string | Destination filter. |
| `country` | string | Country filter. |
| `status` | string | Status filter. |
| `source` | string | Lead/source filter. |
| `leadSource` | string | Alternate lead source filter. |
| `currency` | string | Currency display/aggregation where supported. |

Response shape:

```json
{
  "data": {}
}
```

## Executive Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/dashboard/executive-kpis` | Top-level business health. | Executive KPI cards: revenue, profit, bookings, conversion. |
| GET | `/api/reports/monthly-summary` | Month summary snapshot. | Month-level business comparison and summary table. |
| GET | `/api/reports/funnel/conversion` | Pipeline stage conversion. | Conversion funnel chart. |
| GET | `/api/reports/forecast/pipeline` | Expected pipeline forecast. | Future revenue / deal forecast views. |

## Lead Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/leads/by-source` | Understand lead source quality. | Leads tab source table and source chart. |
| GET | `/api/reports/leads/by-consultant` | See lead ownership by consultant. | Consultant distribution report. |
| GET | `/api/reports/leads/deal-lines` | Detailed lead/deal list. | Drilldown export and exact row-level analysis. Supports `limit`. |
| GET | `/api/reports/leads/aging` | Find stale or old leads. | Aging buckets and stale lead report. |
| GET | `/api/reports/leads/lost` | Understand lost lead reasons. | Lost reasons chart/table. |

## People Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/people/performance` | Per-person productivity and revenue. | People tab KPIs, top people chart, person drilldown table, CSV export. |

Expected business result examples:

- assigned leads
- converted leads
- conversion percent
- average response time
- quotations sent / approved
- bookings
- booking value
- collected amount
- outstanding amount
- profit
- missed follow-ups

## Quotation Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/quotations/performance` | Quotation productivity and conversion. | Quotations tab: quotes created, sent, approved, quote-to-booking rate, lead-to-quote time. |

## Booking Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/bookings/performance` | Booking volume and booking value. | Bookings tab: bookings trend, value, cancellations, destination performance. |

## Revenue Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/revenue/monthly` | Revenue over time. | Revenue trend line chart. |
| GET | `/api/reports/revenue/by-service-type` | Service-wise revenue split. | Service breakdown charts/tables. |
| GET | `/api/reports/revenue/by-destination` | Destination-wise revenue. | Top destination chart/table. |

## Sales Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/sales/target-vs-achievement` | Compare targets with actuals. | Sales target vs achievement section. |

## Finance Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/finance/summary` | Finance health summary. | Finance KPI strip: booked, collected, outstanding, refunds, profit, margin. |
| GET | `/api/reports/payments/outstanding` | Pending money tracking. | Outstanding payment table and finance follow-up. |
| GET | `/api/reports/payments/mode` | Payment mode split. | Payment mode donut chart. |
| GET | `/api/reports/profit/margin` | Profitability tracking. | Margin and profit analysis. |
| GET | `/api/reports/finance/cost-breakup` | Cost-level finance drilldown. | Detailed cost table. Supports `page`, `limit`, `currency`. |
| GET | `/api/reports/finance/supplier-services` | Supplier service finance rows. | Supplier service table and export. Supports `supplierId`, `page`, `limit`. |

## Visa Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/visa/summary` | Visa operation status. | Visa status cards and operational bottleneck report. |

## Follow-up Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/followups/today` | Today pending follow-ups. | Operations dashboard and reminders. Supports `date`, `userId`. |
| GET | `/api/reports/followups/missed` | Missed follow-up discipline. | Missed follow-up KPI and person discipline report. Supports `date`, `userId`. |
| GET | `/api/reports/followups/call-log` | Call activity tracking. | Call log table and activity audit. |

## Activity Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/activities/feed` | Recent CRM activity. | Activity feed and user audit trail. Supports `limit`. |

## Marketing Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/marketing/performance` | Campaign/source performance. | Marketing tab: campaign quality, leads, conversion, ROI/ROAS if cost data exists. |

## Supplier Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/suppliers/performance` | Supplier productivity and cost. | Supplier performance tables. Supports `supplierId`. |

## Operations Reports

| Method | URL | Why used | Result used for |
| --- | --- | --- | --- |
| GET | `/api/reports/operations/performance` | Operational discipline and bottlenecks. | Operations tab: follow-up discipline, complaint status, service bottlenecks. |

## Frontend Usage Map

Current frontend file: `crm-frontend/src/api/reports.ts`

| Frontend function | Backend endpoint | Page usage |
| --- | --- | --- |
| `getExecutiveKpis()` | `/dashboard/executive-kpis` | Executive KPI cards. |
| `getRevenueMonthly()` | `/revenue/monthly` | Executive revenue trend. |
| `getConversionFunnel()` | `/funnel/conversion` | Executive funnel chart. |
| `getPeoplePerformance()` | `/people/performance` | People tab and Executive top people. |
| `getFinanceSummary()` | `/finance/summary` | Finance tab and Executive outstanding/refunds. |
| `getLeadsBySource()` | `/leads/by-source` | Leads placeholder/tab. |
| `getQuotationPerformance()` | `/quotations/performance` | Quotations tab. |
| `getBookingPerformance()` | `/bookings/performance` | Bookings tab. |
| `getMarketingPerformance()` | `/marketing/performance` | Marketing tab. |
| `getOperationsPerformance()` | `/operations/performance` | Operations tab. |
| `supplierPerformance()` | `/suppliers/performance` | Supplier performance section. |
| `pipelineForecast()` | `/forecast/pipeline` | Forecast section. |
| `followupsToday()` | `/followups/today` | Today follow-up report. |
| `followupsMissed()` | `/followups/missed` | Missed follow-up report. |
| `callLog()` | `/followups/call-log` | Call log table. |
| `activityFeed()` | `/activities/feed` | Activity feed. |

## Notes

- Frontend must not calculate business truth like revenue, profit, conversion, margin, outstanding, refunds, or person performance.
- Backend reports calculate those metrics.
- Frontend only formats values, builds charts/tables, handles empty/error states, and exports visible rows.
- API failure must show error state, not fake zero values.
- Empty result must show empty state.
