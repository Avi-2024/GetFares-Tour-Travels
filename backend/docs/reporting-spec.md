# Reporting Specification (v1 Scope)

## 1. Purpose
Defines report inventory, business formulas, required filters, and API outputs for management and operational monitoring.

## 2. Global Report Rules
- Timezone: Asia/Calcutta for business-day reporting.
- Date filters: today, week, month, custom range.
- Export formats: CSV, XLSX, PDF.
- All reports must support role-based visibility.

## 3. Lead Management Reports

### 3.1 Leads by Source
Definition:
- Count of leads grouped by `source` in selected date range.
Metrics:
- total leads
- converted leads
- conversion percent
Filters:
- date range, destination, assignee

### 3.2 Leads by Sales Executive
Definition:
- Leads assigned to each consultant.
Metrics:
- assigned
- contacted
- converted
- conversion percent
- avg response time

### 3.3 Lead Aging Report
Definition:
- Open leads grouped by age buckets.
Buckets:
- `0-1 day`, `2-3 days`, `4-7 days`, `8+ days`

### 3.4 Lost Lead Report
Definition:
- Leads with status `LOST` and captured closure reason.
Metrics:
- count by reason
- loss percent of total leads

## 4. Sales and Revenue Reports

### 4.1 Revenue by Month
Formula:
- Sum of confirmed booking `total_amount` grouped by month.

### 4.2 Revenue by Service Type
Service types:
- Holiday
- Visa
- Combined
Formula:
- Revenue grouped by service type tag.

### 4.3 Revenue by Destination
Formula:
- Sum booking revenue grouped by destination.

### 4.4 Sales Target vs Achievement
Scope:
- consultant and overall.
Formula:
- achievement percent = `actual / target * 100`.

## 5. Payment and Accounts Reports

### 5.1 Outstanding Payment Report
Definition:
- Bookings where payment is pending/partial with due dates.
Metrics:
- outstanding amount
- aging bucket

### 5.2 Payment Mode Report
Definition:
- Payment count and total amount by `payment_mode`.

### 5.3 Profit Margin Report
Formula:
- margin percent = `(total_amount - cost_amount) / total_amount * 100`.
Outputs:
- booking-level and aggregate margin.

## 6. Visa Reports

### 6.1 Visa Success Rate
Formula:
- approved / (approved + rejected) * 100.

### 6.2 Visa Rejection Rate
Formula:
- rejected / (approved + rejected) * 100.

### 6.3 Pending Documentation
Definition:
- cases where mandatory document checklist is incomplete.

### 6.4 Processing Timeline
Definition:
- days from submission to final outcome.
Outputs:
- average, p50, p90.

## 7. Follow-up and Productivity Reports

### 7.1 Today's Follow-ups
Definition:
- follow-ups due on current date and not completed.

### 7.2 Missed Follow-ups
Definition:
- follow-ups where `followup_date < now` and `is_completed=false`.

### 7.3 Call Log / Activity Report
Definition:
- activity volume by user and activity type.
Metrics:
- calls, whatsapp, email, status changes, quotations sent.

## 8. Marketing Performance Reports

### 8.1 Campaign Performance
Metrics:
- leads generated
- spend
- revenue generated
- CPL
- ROI

Formulas:
- CPL = `spend / leads`
- ROI percent = `(revenue - spend) / spend * 100`

### 8.2 Lead Source ROI
Definition:
- ROI grouped by source channel (Meta, Website, WhatsApp, etc).

## 9. Management Monthly Summary
Metrics:
- total leads
- total bookings
- conversion percent
- revenue
- cost
- profit
- avg booking value
- avg margin percent
- destination performance
- consultant ranking

## 10. API Endpoints (Target)
- `GET /api/reports/leads/by-source`
- `GET /api/reports/leads/by-consultant`
- `GET /api/reports/leads/aging`
- `GET /api/reports/leads/lost`
- `GET /api/reports/revenue/monthly`
- `GET /api/reports/revenue/service-type`
- `GET /api/reports/revenue/destination`
- `GET /api/reports/targets/achievement`
- `GET /api/reports/payments/outstanding`
- `GET /api/reports/payments/mode`
- `GET /api/reports/profit/margin`
- `GET /api/reports/visa/success-rate`
- `GET /api/reports/visa/rejection-rate`
- `GET /api/reports/visa/pending-docs`
- `GET /api/reports/visa/timeline`
- `GET /api/reports/followups/today`
- `GET /api/reports/followups/missed`
- `GET /api/reports/activity/call-log`
- `GET /api/reports/marketing/campaigns`
- `GET /api/reports/marketing/source-roi`
- `GET /api/reports/management/monthly-summary`

## 11. Data Dependencies
Primary tables:
- `leads`, `followups`, `lead_activities`
- `quotations`, `bookings`, `payments`, `refunds`
- `visa_cases`, `visa_documents`, `documentation_checklist`
- `campaigns`, `customers`, `users`
- `supplier_payables`, `tax_ledger`, `exchange_rates`

## 12. Implementation Status
- Currently available: `GET /api/quotations/reports/lead-to-quote`
- Remaining reports in this document: planned backlog for reporting module.
