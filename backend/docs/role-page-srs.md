# Role and Page SRS (Backend-Aligned)

## 1. Purpose
This document translates the PRD into page-wise role behavior with backend implications. It is intended for UI, API, and QA alignment.

## 2. Role Matrix
- Admin: full access, user and rule configuration, integrations, global reports.
- Manager: team oversight, assignment control, SLA escalation handling, performance views.
- Sales Consultant: lead handling, follow-ups, quotation lifecycle, booking conversion.
- Visa Executive: visa case pipeline and document compliance.
- Accounts Team: payment verification, invoicing, refund control, finance reconciliation.
- Marketing: campaign analytics, audience segmentation, outbound communication controls.
- Operations: complaints, post-sale incidents, service recovery workflow.
- Management: read-only dashboards and monthly summary.

## 3. Shared UX Rules
- All data-changing actions must write audit logs.
- All secured pages require JWT and permission checks.
- Every list supports pagination and date/filter controls.
- Every timeline shows actor, action, timestamp.

## 4. Admin Panel

### 4.1 Admin Dashboard
Fields/Widgets:
- Total leads (today/week/month)
- Converted leads
- Revenue split (holiday/visa)
- Profit
- Conversion rate
- Active users
- Pending follow-ups
- Destination trend
- Source performance
Buttons:
- Date filter
- Export PDF/Excel
- Drill-down navigation
Backend actions:
- Read KPI aggregates and trend reports
Automations:
- SLA breach alert indicators

### 4.2 User and Role Management
Fields:
- Full name, email, phone
- Role
- Target amount
- Incentive percent
- Expertise destinations
- Leave toggle
Buttons:
- Create user
- Edit user
- Activate/deactivate
- Reset password
- Assign role
Backend actions:
- `/api/users/*`
- `/api/rbac/assign`
Automations:
- Notify user on role changes

### 4.3 Lead Distribution Rules
Fields:
- Round-robin flag
- Destination rule
- Budget rule
- Expertise rule
- Max active leads
- Response SLA minutes
- Auto-reassign flag
Buttons:
- Save rule set
- Manual override
Backend actions:
- Lead assignment/distribution endpoints
Automations:
- Skip on-leave/inactive users

### 4.4 Integration Settings
Fields:
- Meta credentials
- WhatsApp credentials
- SMTP credentials
- Webhook endpoints
Buttons:
- Test connection
- Save credentials
- View webhook logs
Backend actions:
- Config service reads/writes
Automations:
- Integration health notifications

## 5. Manager Panel

### 5.1 Manager Dashboard
Widgets:
- Team revenue
- Team conversion
- Agent ranking
- Overdue leads
- Today follow-ups
- Pending visa cases
Buttons:
- Filter by agent
- Filter by date range
Backend actions:
- KPI report endpoints

### 5.2 Lead Monitoring
Columns:
- Lead name
- Contact
- Destination
- Budget
- Status
- Assignee
- Source
- Last activity
Buttons:
- Filter
- Bulk reassign
- View timeline
- Force close
Backend actions:
- Leads list/update/reassign APIs

### 5.3 Performance View
Metrics:
- Leads assigned
- Leads converted
- Revenue generated
- Conversion percent
- Avg response time
Buttons:
- Export report
Backend actions:
- Consultant report APIs

## 6. Sales Consultant Panel

### 6.1 Sales Dashboard
Widgets:
- Assigned leads
- Today follow-ups
- Target vs achievement
- Pending payments
- New lead alerts
Buttons:
- Quick call
- Quick status update
- Add follow-up
Backend actions:
- Leads/notifications endpoints

### 6.2 Lead Detail
Fields:
- Full name
- Phone
- Email
- PAN
- Address
- Destination
- Travel date
- Budget
- Source
- Status
- Notes
Buttons:
- Call
- WhatsApp
- Create quotation
- Convert to booking
- Mark lost
Backend actions:
- Lead update
- Follow-up create
- Assignment updates
Automations:
- SLA timers
- Follow-up reminders

### 6.3 Quotation Builder
Fields:
- Lead selector
- Template selector
- Components (hotel/flight/transfer/visa/insurance/other)
- Margin
- Discount
- Tax
- Final price
Buttons:
- Save draft
- Generate PDF
- Send
- Approve/reject transition
Backend actions:
- Quotations create/update/send/status/view report
Automations:
- Margin guard
- Quote reminder runner

### 6.4 Follow-up Board
Views:
- Today
- Overdue
- Upcoming
Buttons:
- Add note
- Reschedule
- Mark done
Backend actions:
- Follow-up create/list/process APIs

### 6.5 Booking View
Fields:
- Booking number
- Travel dates
- Total/cost/profit
- Payment status
- Currency details
Buttons:
- Record payment
- Generate invoice
- Raise refund
Backend actions:
- Booking/payment/refund APIs

## 7. Visa Executive Panel

### 7.1 Visa Dashboard
Widgets:
- Pending docs
- Upcoming appointments
- Submitted cases
- Approved/rejected cases
Buttons:
- Filter by country/status
Backend actions:
- Visa list and status queries

### 7.2 Visa Case Detail
Fields:
- Country
- Visa type
- Fees
- Supplier
- Appointment
- Submission
- Status
- Rejection reason
Buttons:
- Upload document
- Verify document
- Update status
- Send reminder
Backend actions:
- Visa and document checklist endpoints

## 8. Accounts Panel

### 8.1 Payments Console
Fields:
- Booking ID
- Amount
- Currency
- Payment mode
- Gateway reference
- Verification status
Buttons:
- Verify payment
- Mark partial/full
- Upload proof
Backend actions:
- Payments CRUD + verification workflow

### 8.2 Refund Console
Fields:
- Booking
- Payment reference
- Refund amount
- Supplier penalty
- Service charge
- Approval state
Buttons:
- Approve/reject/process
Backend actions:
- Refund APIs

### 8.3 Finance Reconciliation
Widgets:
- Outstanding dues
- Supplier payables
- Tax ledger summary
- Margin summary
Buttons:
- Export reconciliation
Backend actions:
- Reporting + payables + tax ledger endpoints

## 9. Marketing Panel

### 9.1 Campaign Dashboard
Widgets:
- Leads by campaign
- Cost per lead
- Conversion
- ROI
Buttons:
- Date filter
- Export
Backend actions:
- Campaign CRUD and analytics reports

### 9.2 Segmentation and Outreach
Fields:
- Segment filters (destination, LTV, last travel, segment)
- Message template
- Schedule date
Buttons:
- Preview
- Schedule send
Backend actions:
- Customer segmentation + notifications pipeline

## 10. Operations Panel

### 10.1 Operations Dashboard
Widgets:
- Active complaints
- Refund requests
- Cancellations
- Emergency cases
Buttons:
- Filter and assign
Backend actions:
- Complaints and post-sales modules

### 10.2 Complaint Detail
Fields:
- Booking
- Issue type
- Description
- Assignee
- Status
Buttons:
- Add note
- Escalate
- Resolve
Backend actions:
- Complaint update and activity APIs

## 11. Management Panel

### 11.1 Executive Dashboard (Read-only)
Widgets:
- Leads, bookings, conversion
- Revenue, cost, profit
- Avg booking value
- Avg margin
- Destination and consultant performance
Buttons:
- Date filter
- Export monthly summary
Backend actions:
- Reporting read endpoints only

## 12. Security and Audit Requirements
- Rate-limit login attempts and lock policy.
- Enforce RBAC per endpoint.
- Store login and critical action audits.
- Restrict sensitive pages by role and permission.

## 13. Pending Backend Dependencies
1. Replace baseline generic payload modules with PRD-specific field contracts.
2. Add dedicated supplier APIs.
3. Complete reports API coverage for every dashboard card in this SRS.
4. Finalize quotation template/version/send-log persistence.
