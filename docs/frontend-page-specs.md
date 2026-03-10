# Frontend Page Specifications (Zero-to-Build)

## 1. Purpose
This is a frontend-first specification for building UI from scratch.

Each page includes:
1. Route
2. Roles
3. Layout sections
4. Fields and input types
5. Button actions
6. Validation rules
7. API mapping
8. UI states
9. Done criteria

Use this as sprint-wise frontend execution document.

## 2. Global UI Rules
| Item | Rule |
| --- | --- |
| Date format | `YYYY-MM-DD` |
| DateTime format | ISO string |
| UUID fields | hidden or select-based, never free text |
| Currency | numeric input with 2 decimals |
| Required fields | mark with `*` and show inline error |
| API error display | top alert + field-level errors where possible |
| Loading state | skeleton for tables, spinner for submit |
| Empty state | contextual CTA (`Create`, `Add`, `Import`) |

## 3. Page Specs

## 3.1 Login Page
| Item | Spec |
| --- | --- |
| Route | `/login` |
| Roles | Public |
| Purpose | Authenticate user and load permissions |

### Sections
| Section | Content |
| --- | --- |
| Header | Brand logo + app name |
| Form | Email, password, remember me, submit |
| Footer links | Forgot password, support |

### Fields
| Key | Label | Type | Required | Rule |
| --- | --- | --- | --- | --- |
| `email` | Email | email | Yes | valid email |
| `password` | Password | password | Yes | min 8 |
| `rememberMe` | Remember me | checkbox | No | UI only |

### Actions
| Action | Behavior |
| --- | --- |
| Sign In | `POST /api/auth/login` |
| After login | Save token, fetch `GET /api/rbac/me/permissions` |
| Redirect | Role/permission based dashboard route |

### UI States
| State | UI |
| --- | --- |
| Loading | Disable submit + spinner |
| Invalid credentials | Inline alert under form |
| Success | Redirect + success toast |

### Done Criteria
1. Login works with real API.
2. Token persists across refresh.
3. Unauthorized redirect to login works.

## 3.2 Main Dashboard
| Item | Spec |
| --- | --- |
| Route | `/dashboard` |
| Roles | Admin, Manager, Management, Team Leads |
| Purpose | Snapshot of lead, conversion, revenue, follow-up, visa KPIs |

### Sections
| Section | Content |
| --- | --- |
| KPI Cards | Leads, converted, revenue, profit, pending follow-ups |
| Charts | Lead source, conversion funnel, monthly revenue |
| Alerts | SLA breach, pending approvals, overdue tasks |
| Quick Actions | Create lead, create quote, open reports |

### Filters
| Key | Type | Default |
| --- | --- | --- |
| `from` | date | first day of current month |
| `to` | date | today |

### APIs
| Use Case | Endpoint |
| --- | --- |
| Executive KPI | `GET /api/reports/dashboard/executive-kpis` |
| Funnel | `GET /api/reports/funnel/conversion` |
| Revenue | `GET /api/reports/revenue/monthly` |
| Notifications | `GET /api/notifications/unread-count` |

### Done Criteria
1. All widgets load in parallel.
2. Date filter refreshes all KPI blocks.
3. No-blocking fallback on partial API failure.

## 3.3 Leads List Page
| Item | Spec |
| --- | --- |
| Route | `/leads` |
| Roles | Sales, Manager, Admin |
| Purpose | View, filter, assign, and open leads quickly |

### Table Columns
| Column |
| --- |
| Lead Name |
| Phone |
| Email |
| Destination |
| Travel Date |
| Budget |
| Source |
| Status |
| Assigned To |
| Next Follow-up |
| Created At |
| Actions |

### Filters
| Key | Type |
| --- | --- |
| `status` | enum select |
| `source` | text/select |
| `assignedTo` | user select |
| `email` | text |
| `phone` | text |
| `page`, `limit` | pagination |

### Actions
| Button | Behavior |
| --- | --- |
| New Lead | open create drawer/modal |
| Distribute Leads | `POST /api/leads/distribute` |
| Reassign Inactive | `POST /api/leads/reassign-inactive` |
| Process SLA | `POST /api/leads/sla/process-breaches` |
| Open Lead | navigate `/leads/:id` |

### Lead Create Fields
| Key | Type | Required |
| --- | --- | --- |
| `fullName` | text | Yes |
| `phone` | text | No |
| `email` | email | No |
| `panNumber` | text | No |
| `addressLine` | textarea | No |
| `clientCurrency` | text/select | No |
| `destinationId` | destination select | No |
| `travelDate` | date | No |
| `budget` | number | No |
| `source` | select/text | No |
| `campaignId` | campaign select | No |
| `utmSource` | text | No |
| `utmMedium` | text | No |
| `utmCampaign` | text | No |
| `respondedPositively` | switch | No |
| `priorityLevel` | number | No |
| `isVip` | switch | No |
| `status` | enum | No |
| `assignedTo` | user select | No |
| `qualificationCompleted` | switch | No |
| `closedReason` | textarea | Conditional |
| `nextFollowupDate` | date | No |
| `notes` | textarea | No |
| `autoAssign` | switch | No |

### APIs
| Use Case | Endpoint |
| --- | --- |
| List leads | `GET /api/leads` |
| Create lead | `POST /api/leads` |

### Done Criteria
1. Lead list supports server pagination and filters.
2. Duplicate lead errors are shown clearly.
3. SLA and distribution actions accessible only to authorized roles.

## 3.4 Lead Detail Page
| Item | Spec |
| --- | --- |
| Route | `/leads/:id` |
| Roles | Sales, Manager, Admin |
| Purpose | Manage single lead lifecycle and actions |

### Sections
| Section | Content |
| --- | --- |
| Lead Profile | customer and travel data |
| Qualification | priority, VIP, response flags |
| Timeline | activities + status changes |
| Follow-ups | upcoming and completed follow-ups |
| Linked Quotes | related quotation list |

### Key Actions
| Button | Endpoint |
| --- | --- |
| Update lead | `PATCH /api/leads/:id` |
| Assign lead | `POST /api/leads/:id/assign` |
| Add follow-up | `POST /api/leads/:id/followups` |
| View overdue list | `GET /api/leads/followups/overdue` |
| Create quotation | navigate to quotation builder with `leadId` |

### Mandatory Business Validation
| Rule |
| --- |
| If status is `LOST`, require `closedReason`. |

### Done Criteria
1. All lead updates are persisted.
2. Follow-up create flow works.
3. Lead to quotation jump is one click.

## 3.5 Quotations List Page
| Item | Spec |
| --- | --- |
| Route | `/quotations` |
| Roles | Sales, Manager, Admin, Management (read) |
| Purpose | Search and track quotations and conversion stage |

### Table Columns
| Column |
| --- |
| Quote ID |
| Lead |
| Template |
| Version |
| Margin % |
| Final Price |
| Status |
| Sent At |
| View Count |
| Created By |
| Actions |

### Filters
| Key |
| --- |
| `status` |
| `leadId` |
| `createdBy` |
| `includeItems` |
| `page`, `limit` |

### Actions
| Button | Endpoint |
| --- | --- |
| New Quotation | open quotation builder |
| Run reminders | `POST /api/quotations/reminders/run` |
| Lead-to-quote report | `GET /api/quotations/reports/lead-to-quote` |
| Open quote | `/quotations/:id` |

### Done Criteria
1. List and filters match backend.
2. Reminder action result shown in UI.
3. Version and send-log links available per row.

## 3.6 Quotation Builder / Detail Page
| Item | Spec |
| --- | --- |
| Route | `/quotations/new`, `/quotations/:id` |
| Roles | Sales, Manager, Admin |
| Purpose | Create, edit, send, and transition quotation |

### Sections
| Section | Content |
| --- | --- |
| Header | lead selector, template selector, quote meta |
| Components | itemized costs grid |
| Pricing Summary | total cost, margin, discount, tax, final |
| Finance Block | supplier cost, service fee, GST, TCS, currencies |
| Actions | save, pdf, send, approve/reject |
| Tabs | versions, views, send logs |

### Core Inputs
| Key | Type | Required |
| --- | --- | --- |
| `leadId` | select | Yes |
| `templateId` | select | No |
| `components[]` | repeater | Yes |
| `marginPercent` | number | Yes |
| `discount` | number | No |
| `taxPercent`/`taxAmount` | number | No |
| `supplierCost` | number | No |
| `markupAmount` | number | No |
| `serviceFeeAmount` | number | No |
| `gstAmount` | number | No |
| `tcsAmount` | number | No |
| `clientCurrency` | select/text | No |
| `supplierCurrency` | select/text | No |

### Component Row Fields
| Key | Type |
| --- | --- |
| `itemType` (`HOTEL/FLIGHT/TRANSFER/VISA/INSURANCE/OTHER`) | select |
| `description` | text |
| `cost` | number |

### Actions and APIs
| Action | Endpoint |
| --- | --- |
| Create | `POST /api/quotations` |
| Update | `PATCH /api/quotations/:id` |
| Generate PDF | `POST /api/quotations/:id/generate-pdf` |
| Send | `POST /api/quotations/:id/send` |
| Track public view | `POST /api/quotations/:id/viewed` |
| Get views | `GET /api/quotations/:id/views` |
| Approve margin | `POST /api/quotations/:id/approve-margin` |
| Change status | `POST /api/quotations/:id/status` |
| Versions | `GET /api/quotations/:id/versions` |
| Send logs | `GET /api/quotations/:id/send-logs` |

### Status Transition Rule
| Status | Rule |
| --- | --- |
| `REJECTED` | `reason` mandatory |
| `APPROVED` | can continue to booking creation |

### Done Criteria
1. Full quotation lifecycle works from draft to sent to approved/rejected.
2. Quote viewer tracking works.
3. Version and send history visible.

## 3.7 Quotation Template Management Page
| Item | Spec |
| --- | --- |
| Route | `/quotations/templates` |
| Roles | Admin, Manager |
| Purpose | Manage reusable quote templates |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `code` | text | Yes |
| `name` | text | Yes |
| `templateType` | enum | Yes |
| `headerBranding` | textarea | No |
| `inclusions` | textarea | No |
| `exclusions` | textarea | No |
| `paymentTerms` | textarea | No |
| `cancellationPolicy` | textarea | No |
| `footerDisclaimer` | textarea | No |
| `minMarginPercent` | number | No |
| `isActive` | switch | No |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/quotations/templates` |
| Create | `POST /api/quotations/templates` |
| Update | `PATCH /api/quotations/templates/:id` |

### Done Criteria
1. Template CRUD works.
2. Template can be selected in quotation builder.

## 3.8 Bookings List Page
| Item | Spec |
| --- | --- |
| Route | `/bookings` |
| Roles | Sales, Accounts, Manager, Admin |
| Purpose | Track booking lifecycle and payment readiness |

### Table Columns
| Column |
| --- |
| Booking Number |
| Quotation ID |
| Travel Start |
| Travel End |
| Total Amount |
| Cost Amount |
| Profit |
| Status |
| Payment Status |
| Advance Required |
| Advance Received |
| Actions |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/bookings` |
| Create | `POST /api/bookings` |
| Open detail | `/bookings/:id` |

### Done Criteria
1. Booking list supports status and payment status filters.
2. Profit shown from API response.

## 3.9 Booking Detail Page
| Item | Spec |
| --- | --- |
| Route | `/bookings/:id` |
| Roles | Sales, Accounts, Manager, Admin |
| Purpose | Update booking, manage status, invoices, related financial flow |

### Sections
| Section | Content |
| --- | --- |
| Booking Info | dates, amounts, currencies |
| Status Controls | pending/confirmed/cancelled |
| Invoice Panel | list invoices, generate invoice |
| Payment Snapshot | advance required/received and payment status |
| History | booking status history timeline |

### Actions
| Action | Endpoint |
| --- | --- |
| Update booking | `PATCH /api/bookings/:id` |
| Change status | `POST /api/bookings/:id/status` |
| List history | `GET /api/bookings/:id/status-history` |
| Generate invoice | `POST /api/bookings/:id/invoices/generate` |
| List invoices | `GET /api/bookings/:id/invoices` |

### Validation Rule
| Rule |
| --- |
| If status is `CANCELLED`, `cancellationReason` required. |

### Done Criteria
1. Booking status transition works.
2. Invoice generation and listing works.
3. History timeline reflects transitions.

## 3.10 Payments Page
| Item | Spec |
| --- | --- |
| Route | `/payments` |
| Roles | Accounts, Admin, Manager (read), Sales (read own context) |
| Purpose | Record and verify payments |

### Form Inputs
| Key | Type | Required |
| --- | --- | --- |
| `bookingId` | select | Yes |
| `amount` | number | Yes |
| `currency` | select/text | No |
| `paymentMode` | enum select | Yes |
| `gatewayProvider` | text | No |
| `gatewayOrderId` | text | No |
| `gatewayPaymentId` | text | No |
| `gatewaySignature` | text | No |
| `paymentReference` | text | No |
| `proofUrl` | url | No |
| `paidAt` | datetime | No |
| `status` | enum | No |

### Verify Modal Inputs
| Key | Type |
| --- | --- |
| `paidAt` | datetime |
| `status` | enum |
| `proofUrl` | url |
| `paymentReference` | text |
| `gatewayPaymentId` | text |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/payments` |
| Create | `POST /api/payments` |
| Update | `PATCH /api/payments/:id` |
| Verify | `POST /api/payments/:id/verify` |
| Get by id | `GET /api/payments/:id` |

### Done Criteria
1. Create and verify flows work.
2. Payment status updates visible in booking context.

## 3.11 Refunds Page
| Item | Spec |
| --- | --- |
| Route | `/refunds` |
| Roles | Accounts, Manager, Admin |
| Purpose | Manage refund lifecycle |

### Form Inputs
| Key | Type | Required |
| --- | --- | --- |
| `bookingId` | select | Yes |
| `paymentId` | select | No |
| `refundAmount` | number | Yes |
| `supplierPenalty` | number | No |
| `serviceCharge` | number | No |
| `gatewayRefundId` | text | No |

### Workflow Buttons
| Action | Endpoint |
| --- | --- |
| Approve | `POST /api/refunds/:id/approve` |
| Reject | `POST /api/refunds/:id/reject` |
| Process | `POST /api/refunds/:id/process` |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/refunds` |
| Create | `POST /api/refunds` |
| Update | `PATCH /api/refunds/:id` |
| Get by id | `GET /api/refunds/:id` |

### Done Criteria
1. Refund status transitions are reflected correctly.
2. Approve/reject/process actions available per status.

## 3.12 Visa Cases List Page
| Item | Spec |
| --- | --- |
| Route | `/visa` |
| Roles | Visa Executive, Manager, Admin |
| Purpose | Track visa pipeline and workload |

### Table Columns
| Column |
| --- |
| Visa Case ID |
| Booking |
| Country |
| Visa Type |
| Status |
| Appointment Date |
| Submission Date |
| Visa Valid Until |
| Actions |

### Filters
| Key |
| --- |
| `status` |
| `country` |
| `bookingId` |
| `supplierId` |
| `page`, `limit` |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/visa` |
| Create | `POST /api/visa` |

### Done Criteria
1. Visa list and filters work.
2. Create case action opens detail flow.

## 3.13 Visa Detail Page
| Item | Spec |
| --- | --- |
| Route | `/visa/:id` |
| Roles | Visa Executive, Manager, Admin |
| Purpose | Manage status, documents, and checklist |

### Sections
| Section | Content |
| --- | --- |
| Visa Profile | country, visa type, fees, dates |
| Status Transition | submit/approve/reject actions |
| Documents | upload list + verify |
| Checklist | travel-readiness checklist booleans |
| Summary | derived progress and pending items |

### Status Rule
| Status | Mandatory |
| --- | --- |
| `REJECTED` | `rejectionReason` |
| `APPROVED` | `visaValidUntil` |

### APIs
| Action | Endpoint |
| --- | --- |
| Get case | `GET /api/visa/:id` |
| Update case | `PATCH /api/visa/:id` |
| Transition status | `POST /api/visa/:id/status` |
| List docs | `GET /api/visa/:id/documents` |
| Add doc | `POST /api/visa/:id/documents` |
| Verify doc | `PATCH /api/visa/documents/:documentId/verify` |
| Get checklist | `GET /api/visa/:id/checklist` |
| Update checklist | `PATCH /api/visa/:id/checklist` |

### Done Criteria
1. Document upload and verification works.
2. Checklist update persists correctly.
3. Status rules enforced in UI.

## 3.14 Campaigns Page
| Item | Spec |
| --- | --- |
| Route | `/campaigns` |
| Roles | Marketing, Admin, Manager |
| Purpose | Manage campaign setup and performance metadata |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `name` | text | Yes |
| `source` | text/select | No |
| `budget` | number | No |
| `actualSpend` | number | No |
| `leadsGenerated` | number | No |
| `revenueGenerated` | number | No |
| `metaCampaignId` | text | No |
| `metaAdsetId` | text | No |
| `metaAdId` | text | No |
| `startDate` | date | No |
| `endDate` | date | No |

### API
| Action | Endpoint |
| --- | --- |
| List | `GET /api/campaigns` |
| Create | `POST /api/campaigns` |
| Update | `PATCH /api/campaigns/:id` |
| Get one | `GET /api/campaigns/:id` |

### Done Criteria
1. Date range validation in UI (`endDate >= startDate`).
2. Campaign selectable in lead create forms.

## 3.15 Customers Page
| Item | Spec |
| --- | --- |
| Route | `/customers`, `/customers/:id` |
| Roles | Sales, Marketing, Manager, Admin |
| Purpose | Maintain customer profile and segmentation data |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `fullName` | text | Yes |
| `phone` | text | No |
| `email` | email | No |
| `preferences` | textarea | No |
| `lifetimeValue` | number | No |
| `segment` | enum select | No |
| `panNumber` | text | No |
| `addressLine` | textarea | No |
| `clientCurrency` | text/select | No |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/customers` |
| Create | `POST /api/customers` |
| Get one | `GET /api/customers/:id` |
| Update | `PATCH /api/customers/:id` |

### Done Criteria
1. Customer profile can be created and edited.
2. Customer data can be referenced in lead context.

## 3.16 Complaints Page
| Item | Spec |
| --- | --- |
| Route | `/complaints`, `/complaints/:id` |
| Roles | Operations, Manager, Admin |
| Purpose | Post-sales complaint handling with activity trail |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `bookingId` | select | No |
| `assignedTo` | user select | No |
| `issueType` | text/select | Yes |
| `description` | textarea | Yes |
| `status` | enum select | No |

### Activity Fields
| Key | Type | Required |
| --- | --- | --- |
| `note` | textarea | Yes |
| `userId` | hidden/current user | No |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/complaints` |
| Create | `POST /api/complaints` |
| Get one | `GET /api/complaints/:id` |
| Update | `PATCH /api/complaints/:id` |
| List activities | `GET /api/complaints/:id/activities` |
| Add activity | `POST /api/complaints/:id/activities` |

### Done Criteria
1. Complaint lifecycle updates correctly.
2. Activities timeline is visible and append-only style.

## 3.17 Notifications Panel/Page
| Item | Spec |
| --- | --- |
| Route | global drawer or `/notifications` |
| Roles | All authenticated users with permission |
| Purpose | Show event updates and unread tracking |

### Views
| View | Content |
| --- | --- |
| Notification list | event title, module, time, status |
| Unread badge | numeric count in header |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/notifications` |
| Unread count | `GET /api/notifications/unread-count` |
| Mark read | `PATCH /api/notifications/:id/read` |
| Mark all read | `PATCH /api/notifications/read-all` |

### Done Criteria
1. Unread badge updates after actions.
2. Mark one and mark all both work.

## 3.18 Reports Hub Page
| Item | Spec |
| --- | --- |
| Route | `/reports` + sub-routes |
| Roles | Manager, Admin, Management, Marketing (subset) |
| Purpose | All analytics/report screens in one hub |

### Sub-Pages
| Sub-Page | Endpoint |
| --- | --- |
| Leads by source | `/api/reports/leads/by-source` |
| Leads by consultant | `/api/reports/leads/by-consultant` |
| Lead aging | `/api/reports/leads/aging` |
| Lost leads | `/api/reports/leads/lost` |
| Revenue monthly | `/api/reports/revenue/monthly` |
| Revenue by service type | `/api/reports/revenue/by-service-type` |
| Revenue by destination | `/api/reports/revenue/by-destination` |
| Sales target vs achievement | `/api/reports/sales/target-vs-achievement` |
| Outstanding payments | `/api/reports/payments/outstanding` |
| Payment mode | `/api/reports/payments/mode` |
| Profit margin | `/api/reports/profit/margin` |
| Visa summary | `/api/reports/visa/summary` |
| Follow-ups today | `/api/reports/followups/today` |
| Follow-ups missed | `/api/reports/followups/missed` |
| Follow-up call log | `/api/reports/followups/call-log` |
| Monthly summary | `/api/reports/monthly-summary` |
| Executive KPIs | `/api/reports/dashboard/executive-kpis` |
| Conversion funnel | `/api/reports/funnel/conversion` |
| Marketing performance | `/api/reports/marketing/performance` |
| Supplier performance | `/api/reports/suppliers/performance` |
| Pipeline forecast | `/api/reports/forecast/pipeline` |

### Common Filters
| Key | Type |
| --- | --- |
| `from` | date |
| `to` | date |
| `userId` | user select |
| `date` | date |
| `supplierId` | supplier select |
| `periodMonths` | number (1-12) |

### Done Criteria
1. Each report page has table + chart view.
2. CSV export button present (frontend side; backend export can come later).
3. Filter chips visible and resettable.

## 3.19 User and Role Management Page
| Item | Spec |
| --- | --- |
| Route | `/users` |
| Roles | Admin |
| Purpose | Manage users and assign roles |

### APIs
| Action | Endpoint |
| --- | --- |
| List/create/update users | `/api/users` |
| Assign role | `POST /api/rbac/assign` |
| Current permissions check | `GET /api/rbac/me/permissions` |

### Done Criteria
1. User CRUD works.
2. Role assignment works from same page.

## 3.20 Public Lead Capture Form Specs
| Item | Spec |
| --- | --- |
| Routes | website-side public forms |
| Roles | Public |
| Purpose | Push incoming leads into CRM |

### Required Behavior
1. Map website/Meta/WhatsApp payload to webhook schema.
2. Show success if captured or duplicate.

### Endpoints
| Source | Endpoint |
| --- | --- |
| Meta | `POST /api/webhooks/meta-leads` |
| Website | `POST /api/webhooks/website-enquiry` |
| WhatsApp | `POST /api/webhooks/whatsapp-enquiry` |

### Minimum Payload Rule
At least one identifier must be present:
`fullName` or `name` or `email` or `phone`.

## 4. Suggested Frontend Build Order
1. Auth + permission bootstrap.
2. Leads list + lead detail + follow-ups.
3. Quotations list + quotation builder + templates.
4. Bookings + payments + refunds.
5. Visa cases + documents + checklist.
6. Campaigns + customers + complaints.
7. Reports hub.
8. Notifications polish.

## 5. Non-Available Backend Areas (for now)
1. Dedicated destination CRUD APIs are not exposed.
2. Dedicated supplier CRUD APIs are not exposed.
3. Website package publishing APIs are not exposed.

Use temporary static lists or admin-seeded options until APIs are added.
