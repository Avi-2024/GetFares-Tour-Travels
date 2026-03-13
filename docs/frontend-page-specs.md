# Frontend Master Specification (Client Approval Edition)

## 1. Document Control
| Item | Value |
| --- | --- |
| Product | Getfares Holidays and Visa CRM |
| Document Type | Frontend Master Specification |
| Version | 2.0 |
| Date | 2026-03-13 |
| Source Inputs | PRD, business modules A-N, finance mapping requirements, current backend contracts |
| Primary Audience | Frontend team, QA, Product owner, Client approval stakeholders |

## 2. Objective
This document defines a complete frontend blueprint so the UI can be built end-to-end and shared for client approval.

This version includes:
1. All major PRD modules.
2. Page-by-page UI scope.
3. Fields and validations.
4. Workflow connections between modules.
5. Finance mapping coverage.
6. API readiness and gap visibility.

## 3. Role and Access Matrix
| Role | Primary Access |
| --- | --- |
| Admin | Full system control, configuration, users, roles, reports |
| Manager | Team monitoring, lead oversight, performance, escalations |
| Sales Consultant | Leads, follow-ups, quotations, booking conversion |
| Visa Executive | Visa cases, documents, appointments, status |
| Accounts Team | Payments, invoices, refunds, finance views |
| Marketing Team | Campaigns, segmentation, outreach, ROI |
| Operations Team | Complaints, cancellations, post-sales cases |
| Management | Read-only strategic dashboards and monthly summaries |

## 4. Global UX and Technical Rules
| Item | Rule |
| --- | --- |
| App Type | Responsive web app (desktop-first, tablet/mobile usable) |
| Auth | JWT-based session with role and permission checks |
| Date Format | `YYYY-MM-DD` |
| DateTime Format | ISO timestamp |
| Currency Input | Decimal, 2 precision |
| IDs | UUID hidden in UI, selected via dropdowns |
| Required Fields | Mark with `*`, inline validation errors |
| Error Handling | Top toast + field-level messages |
| Loading States | Skeletons for lists, spinner for submit |
| Empty States | CTA-driven (`Create`, `Add`, `Import`, `Assign`) |
| Audit Visibility | Timeline and actor metadata where applicable |

## 5. End-to-End Frontend Flow
1. Lead captured (manual or webhook).
2. Lead assigned by distribution logic.
3. Consultant contacts lead and updates status.
4. Follow-ups tracked and escalated on SLA breach.
5. Quotation prepared, sent, and tracked for views.
6. Approved quotation converted to booking.
7. Payment captured and verified.
8. Booking confirmed after payment rules.
9. Visa case opened and documentation managed.
10. Refund and complaint workflows handled post-sale.
11. Reports and dashboards consume all module data.

## 6. Shared Master Data and Enums

## 6.1 Lead Lifecycle (Business)
| Status |
| --- |
| New |
| Contacted |
| Follow-up 1 |
| Follow-up 2 |
| Follow-up 3 |
| Final Reminder |
| Quoted |
| Negotiation |
| Hot |
| Warm |
| Cold |
| Converted |
| Lost |
| Non-Responsive |

## 6.2 Lead Lifecycle (Current Backend)
| Status |
| --- |
| OPEN |
| CONTACTED |
| WIP |
| QUOTED |
| FOLLOW_UP |
| CONVERTED |
| LOST |

Frontend rule: show business-friendly labels, map to backend values until expanded statuses are implemented.

## 6.3 Payment Modes
| Mode |
| --- |
| CASH |
| BANK_TRANSFER |
| PAYMENT_GATEWAY |
| UPI |
| CARD |
| BANK |
| GATEWAY |

## 6.4 Quotation Status
| Status |
| --- |
| DRAFT |
| SENT |
| VIEWED |
| APPROVED |
| REJECTED |
| EXPIRED |

## 6.5 Booking Status
| Status |
| --- |
| PENDING |
| CONFIRMED |
| CANCELLED |

## 6.6 Visa Status
| Status |
| --- |
| DOCUMENT_PENDING |
| SUBMITTED |
| APPROVED |
| REJECTED |

## 7. Core Layout and Navigation
| Area | Pages |
| --- | --- |
| Auth | Login, Forgot Password, Reset Password |
| Dashboard | Role-based dashboard(s) |
| Leads | List, Detail, Follow-up board |
| Quotations | List, Builder/Detail, Templates |
| Bookings | List, Detail |
| Finance | Payments, Refunds, Invoices, Profit view |
| Visa | Visa List, Visa Detail, Documents, Checklist |
| Customers | List, Detail Profile |
| Campaigns | List, Create/Edit, Performance |
| Reports | Lead, sales, payment, visa, executive, forecast |
| Users and RBAC | User management, role assignment |
| Operations | Complaints, cancellation operations, emergency log |
| Supplier | Supplier directory and onboarding |
| Package Publishing | Package builder, publish sync log |
| Integrations | Meta/WhatsApp/Email credentials and webhook health |
| Notifications | Notification center panel/page |

## 8. Detailed Page Specifications

## 8.1 Login Page
| Item | Spec |
| --- | --- |
| Route | `/login` |
| Roles | Public |
| Purpose | Authenticate and bootstrap role permissions |

### Fields
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `email` | email | Yes | valid email |
| `password` | password | Yes | min 8 |
| `rememberMe` | checkbox | No | optional |

### Actions
| Action | API |
| --- | --- |
| Sign In | `POST /api/auth/login` |
| Load profile | `GET /api/auth/me` |
| Load permissions | `GET /api/rbac/me/permissions` |

### Acceptance
1. Successful login redirects per role.
2. Invalid credentials handled clearly.
3. Unauthorized routes redirect back to login.

## 8.2 Admin Dashboard
| Item | Spec |
| --- | --- |
| Route | `/dashboard/admin` |
| Roles | Admin |
| Purpose | Global performance and governance cockpit |

### Widgets
| Widget |
| --- |
| Total leads (day/week/month) |
| Converted leads |
| Revenue split (holiday and visa) |
| Profit summary |
| Conversion percent |
| Active agents |
| Pending follow-ups |
| Destination trend |
| Lead source performance |
| SLA compliance |

### APIs
| API |
| --- |
| `/api/reports/dashboard/executive-kpis` |
| `/api/reports/funnel/conversion` |
| `/api/reports/revenue/monthly` |
| `/api/reports/marketing/performance` |
| `/api/notifications/unread-count` |

## 8.3 Manager Dashboard
| Item | Spec |
| --- | --- |
| Route | `/dashboard/manager` |
| Roles | Manager |
| Purpose | Team oversight and operational control |

### Widgets
| Widget |
| --- |
| Team revenue |
| Team conversion percent |
| Agent ranking |
| Overdue leads |
| Today follow-ups |
| Pending visa cases |
| Response time trends |

### APIs
| API |
| --- |
| `/api/reports/leads/by-consultant` |
| `/api/reports/sales/target-vs-achievement` |
| `/api/reports/followups/today` |
| `/api/reports/followups/missed` |
| `/api/reports/followups/call-log` |

## 8.4 Sales Dashboard
| Item | Spec |
| --- | --- |
| Route | `/dashboard/sales` |
| Roles | Sales Consultant |
| Purpose | Personal lead and follow-up productivity view |

### Widgets
| Widget |
| --- |
| My assigned leads |
| Today follow-ups |
| Overdue follow-ups |
| Target vs achievement |
| New lead notifications |
| Pending payments |

## 8.5 Leads List Page
| Item | Spec |
| --- | --- |
| Route | `/leads` |
| Roles | Sales, Manager, Admin |
| Purpose | Search, filter, and action leads |

### Table Columns
| Column |
| --- |
| Lead ID |
| Client Name |
| Contact |
| Email |
| Destination |
| Travel Date |
| Budget |
| Lead Source |
| Campaign |
| Priority |
| Status |
| Assignee |
| Next Follow-up |
| Created At |

### Filters
| Key | Type |
| --- | --- |
| `status` | select |
| `source` | select/text |
| `assignedTo` | user select |
| `email` | text |
| `phone` | text |
| `page` and `limit` | pagination |

### Create Lead Fields
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `fullName` | text | Yes | min 2 |
| `phone` | text | No | 6-20 |
| `email` | email | No | valid email |
| `panNumber` | text | No | 8-20 |
| `addressLine` | textarea | No | 5-2000 |
| `clientCurrency` | select/text | No | 3-10 |
| `destinationId` | select | No | UUID |
| `travelDate` | date | No | valid date |
| `budget` | number | No | >=0 |
| `source` | select/text | No | 2-100 |
| `campaignId` | select | No | UUID |
| `utmSource` | text | No | <=100 |
| `utmMedium` | text | No | <=100 |
| `utmCampaign` | text | No | <=100 |
| `respondedPositively` | switch | No | boolean |
| `priorityLevel` | number | No | int >=0 |
| `isVip` | switch | No | boolean |
| `status` | select | No | enum |
| `assignedTo` | select | No | UUID |
| `qualificationCompleted` | switch | No | boolean |
| `closedReason` | textarea | Conditional | required if LOST |
| `nextFollowupDate` | date | No | valid date |
| `notes` | textarea | No | <=2000 |
| `autoAssign` | switch | No | boolean |

### Actions
| Action | API |
| --- | --- |
| List | `GET /api/leads` |
| Create | `POST /api/leads` |
| Auto distribute | `POST /api/leads/distribute` |
| Reassign inactive | `POST /api/leads/reassign-inactive` |
| Process SLA | `POST /api/leads/sla/process-breaches` |

## 8.6 Lead Detail Page
| Item | Spec |
| --- | --- |
| Route | `/leads/:id` |
| Roles | Sales, Manager, Admin |
| Purpose | Full lifecycle handling of one lead |

### Sections
| Section | Description |
| --- | --- |
| Profile | personal and travel details |
| Qualification | lead type, urgency, VIP, response status |
| Timeline | activity history and state changes |
| Follow-up panel | create and view follow-ups |
| Linked entities | quotations, booking pointer, customer profile |

### Follow-up Fields
| Key | Type | Required |
| --- | --- | --- |
| `followupDate` | datetime | Yes |
| `followupType` | select | No |
| `notes` | textarea | No |
| `userId` | select | No |

### APIs
| API |
| --- |
| `GET /api/leads/:id` |
| `PATCH /api/leads/:id` |
| `POST /api/leads/:id/assign` |
| `POST /api/leads/:id/followups` |
| `GET /api/leads/followups/overdue` |
| `POST /api/leads/followups/process-overdue` |

## 8.7 Quotation List Page
| Item | Spec |
| --- | --- |
| Route | `/quotations` |
| Roles | Sales, Manager, Admin, Management (read) |
| Purpose | Track quotation lifecycle and conversion |

### Table Columns
| Column |
| --- |
| Quote ID |
| Lead |
| Template |
| Version |
| Margin percent |
| Final price |
| Status |
| Sent At |
| View Count |
| Created By |

### Actions
| Action | API |
| --- | --- |
| List | `GET /api/quotations` |
| Run reminders | `POST /api/quotations/reminders/run` |
| Lead-to-quote report | `GET /api/quotations/reports/lead-to-quote` |

## 8.8 Quotation Builder and Detail
| Item | Spec |
| --- | --- |
| Route | `/quotations/new`, `/quotations/:id` |
| Roles | Sales, Manager, Admin |
| Purpose | Build and send quotes with pricing controls |

### Core Fields
| Key | Type | Required |
| --- | --- | --- |
| `leadId` | select | Yes |
| `templateId` | select | No |
| `components[]` | repeater | Yes |
| `marginPercent` | number | Yes |
| `discount` | number | No |
| `taxPercent` | number | No |
| `taxAmount` | number | No |
| `supplierCost` | number | No |
| `supplierTaxAmount` | number | No |
| `markupAmount` | number | No |
| `serviceFeeAmount` | number | No |
| `gstAmount` | number | No |
| `tcsAmount` | number | No |
| `costCurrency` | select/text | No |
| `clientCurrency` | select/text | No |
| `supplierCurrency` | select/text | No |
| `expiresInHours` | number | No |

### Component Row
| Key | Type | Required |
| --- | --- | --- |
| `itemType` | select | Yes |
| `description` | text | Yes |
| `cost` | number | Yes |

### Send and Transition
| Key | Type | Rule |
| --- | --- | --- |
| `channel` | select | EMAIL/WHATSAPP/MANUAL |
| `recipientEmail` | email | optional |
| `recipientPhone` | text | optional |
| `message` | textarea | optional |
| `status` | select | APPROVED/REJECTED |
| `reason` | textarea | required if REJECTED |

### APIs
| API |
| --- |
| `POST /api/quotations` |
| `PATCH /api/quotations/:id` |
| `POST /api/quotations/:id/generate-pdf` |
| `POST /api/quotations/:id/send` |
| `POST /api/quotations/:id/viewed` |
| `GET /api/quotations/:id/views` |
| `POST /api/quotations/:id/approve-margin` |
| `POST /api/quotations/:id/status` |
| `GET /api/quotations/:id/versions` |
| `GET /api/quotations/:id/send-logs` |

## 8.9 Quotation Templates Page
| Item | Spec |
| --- | --- |
| Route | `/quotations/templates` |
| Roles | Admin, Manager |
| Purpose | Manage ready-made quotation templates |

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
| API |
| --- |
| `GET /api/quotations/templates` |
| `POST /api/quotations/templates` |
| `PATCH /api/quotations/templates/:id` |

## 8.10 Bookings List Page
| Item | Spec |
| --- | --- |
| Route | `/bookings` |
| Roles | Sales, Accounts, Manager, Admin |
| Purpose | Track booking state and payment readiness |

### Table Columns
| Column |
| --- |
| Booking Number |
| Quotation |
| Travel Start |
| Travel End |
| Total Amount |
| Cost Amount |
| Profit |
| Status |
| Payment Status |
| Advance Required |
| Advance Received |

### APIs
| API |
| --- |
| `GET /api/bookings` |
| `POST /api/bookings` |

## 8.11 Booking Detail Page
| Item | Spec |
| --- | --- |
| Route | `/bookings/:id` |
| Roles | Sales, Accounts, Manager, Admin |
| Purpose | Booking control with invoice and status history |

### Core Fields
| Key | Type | Required |
| --- | --- | --- |
| `quotationId` | select | Yes on create |
| `bookingNumber` | text | No |
| `travelStartDate` | date | Yes |
| `travelEndDate` | date | Yes |
| `totalAmount` | number | Yes |
| `costAmount` | number | Yes |
| `advanceRequired` | number | No |
| `clientCurrency` | select/text | No |
| `supplierCurrency` | select/text | No |
| `exchangeRate` | number | No |
| `exchangeLocked` | switch | No |
| `paymentStatus` | select | No |
| `cancellationReason` | textarea | required if CANCELLED |

### Actions
| Action | API |
| --- | --- |
| Update booking | `PATCH /api/bookings/:id` |
| Change status | `POST /api/bookings/:id/status` |
| Generate invoice | `POST /api/bookings/:id/invoices/generate` |
| View invoices | `GET /api/bookings/:id/invoices` |
| Status history | `GET /api/bookings/:id/status-history` |

## 8.12 Payments Page
| Item | Spec |
| --- | --- |
| Route | `/payments` |
| Roles | Accounts, Admin, Manager (read) |
| Purpose | Record and verify incoming payments |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `bookingId` | select | Yes |
| `amount` | number | Yes |
| `currency` | select/text | No |
| `paymentMode` | select | Yes |
| `gatewayProvider` | text | No |
| `gatewayOrderId` | text | No |
| `gatewayPaymentId` | text | No |
| `gatewaySignature` | text | No |
| `paymentReference` | text | No |
| `proofUrl` | url | No |
| `status` | select | No |
| `paidAt` | datetime | No |

### APIs
| API |
| --- |
| `GET /api/payments` |
| `POST /api/payments` |
| `PATCH /api/payments/:id` |
| `POST /api/payments/:id/verify` |

## 8.13 Refunds Page
| Item | Spec |
| --- | --- |
| Route | `/refunds` |
| Roles | Accounts, Manager, Admin |
| Purpose | Refund lifecycle and approval handling |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `bookingId` | select | Yes |
| `paymentId` | select | No |
| `refundAmount` | number | Yes |
| `supplierPenalty` | number | No |
| `serviceCharge` | number | No |
| `gatewayRefundId` | text | No |

### Workflow Actions
| Action | API |
| --- | --- |
| Approve | `POST /api/refunds/:id/approve` |
| Reject | `POST /api/refunds/:id/reject` |
| Process | `POST /api/refunds/:id/process` |

## 8.14 Visa Dashboard and List
| Item | Spec |
| --- | --- |
| Route | `/visa` |
| Roles | Visa Executive, Manager, Admin |
| Purpose | Visa pipeline visibility |

### Widgets
| Widget |
| --- |
| Pending documents |
| Upcoming appointments |
| Submitted cases |
| Approved and rejected summary |

### Table Columns
| Column |
| --- |
| Visa Case ID |
| Booking |
| Country |
| Visa Type |
| Fees |
| Appointment Date |
| Status |

### APIs
| API |
| --- |
| `GET /api/visa` |
| `POST /api/visa` |

## 8.15 Visa Detail Page
| Item | Spec |
| --- | --- |
| Route | `/visa/:id` |
| Roles | Visa Executive, Manager, Admin |
| Purpose | Visa case, documents, checklist, status controls |

### Core Fields
| Key | Type | Required |
| --- | --- | --- |
| `country` | text | Yes |
| `visaType` | text/select | Yes |
| `fees` | number | No |
| `supplierId` | select | No |
| `appointmentDate` | date | No |
| `submissionDate` | date | No |
| `visaNumber` | text | No |
| `status` | select | No |
| `rejectionReason` | textarea | required if REJECTED |
| `visaValidUntil` | date | required if APPROVED |

### Document Fields
| Key | Type | Required |
| --- | --- | --- |
| `documentType` | text/select | Yes |
| `fileUrl` | upload/url | Yes |
| `isVerified` | switch | No |

### Checklist Fields
| Key | Type |
| --- | --- |
| `passportVerified` | boolean |
| `visaVerified` | boolean |
| `insuranceVerified` | boolean |
| `ticketVerified` | boolean |
| `hotelVerified` | boolean |
| `transferVerified` | boolean |
| `tourVerified` | boolean |
| `finalItineraryUploaded` | boolean |
| `travelReady` | boolean |

### APIs
| API |
| --- |
| `GET /api/visa/:id` |
| `PATCH /api/visa/:id` |
| `POST /api/visa/:id/status` |
| `GET /api/visa/:id/documents` |
| `POST /api/visa/:id/documents` |
| `PATCH /api/visa/documents/:documentId/verify` |
| `GET /api/visa/:id/checklist` |
| `PATCH /api/visa/:id/checklist` |

## 8.16 Customers List and Profile
| Item | Spec |
| --- | --- |
| Route | `/customers`, `/customers/:id` |
| Roles | Sales, Marketing, Manager, Admin |
| Purpose | 360-degree customer view and segmentation |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `fullName` | text | Yes |
| `phone` | text | No |
| `email` | email | No |
| `panNumber` | text | No |
| `addressLine` | textarea | No |
| `clientCurrency` | select/text | No |
| `preferences` | textarea | No |
| `lifetimeValue` | number | No |
| `segment` | select | No |
| `birthday` | date | Future API |
| `anniversary` | date | Future API |

### APIs
| API |
| --- |
| `GET /api/customers` |
| `POST /api/customers` |
| `GET /api/customers/:id` |
| `PATCH /api/customers/:id` |

## 8.17 Campaigns Page
| Item | Spec |
| --- | --- |
| Route | `/campaigns` |
| Roles | Marketing, Admin, Manager |
| Purpose | Campaign management and source attribution |

### Fields
| Key | Type | Required |
| --- | --- | --- |
| `name` | text | Yes |
| `source` | select/text | No |
| `budget` | number | No |
| `actualSpend` | number | No |
| `leadsGenerated` | number | No |
| `revenueGenerated` | number | No |
| `metaCampaignId` | text | No |
| `metaAdsetId` | text | No |
| `metaAdId` | text | No |
| `startDate` | date | No |
| `endDate` | date | No |

### APIs
| API |
| --- |
| `GET /api/campaigns` |
| `POST /api/campaigns` |
| `GET /api/campaigns/:id` |
| `PATCH /api/campaigns/:id` |

## 8.18 Supplier Management Page
| Item | Spec |
| --- | --- |
| Route | `/suppliers` |
| Roles | Admin, Accounts, Operations, Manager |
| Purpose | Supplier onboarding and service partner governance |

### Fields (Client Requirement)
| Key | Type | Required |
| --- | --- | --- |
| `name` | text | Yes |
| `contactPerson` | text | No |
| `email` | email | Yes |
| `phone` | text | Yes |
| `panNumber` | text | Yes |
| `gstNumber` | text | Conditional |
| `address` | textarea | Yes |
| `invoiceBillingName` | text | Yes |
| `invoiceTaxId` | text | No |
| `bankName` | text | No |
| `bankAccountNumber` | text | No |
| `ifscCode` | text | No |
| `supplierCurrency` | select/text | Yes |

### API Status
| Status |
| --- |
| Supplier CRUD backend endpoint pending (UI to be built with mock adapter first) |

## 8.19 Employee Management Page
| Item | Spec |
| --- | --- |
| Route | `/employees` |
| Roles | Admin, HR, Manager |
| Purpose | Employee directory, attendance, leave, targets |

### Sections
| Section |
| --- |
| Employee directory |
| Attendance board |
| Leave requests |
| Target and incentive management |

### API Status
| Status |
| --- |
| User CRUD is available via `/api/users`; attendance and leave dedicated APIs pending |

## 8.20 Operations Console
| Item | Spec |
| --- | --- |
| Route | `/operations` |
| Roles | Operations, Manager, Admin |
| Purpose | Complaint, cancellation, escalation handling |

### Modules
| Module |
| --- |
| Complaint tracking |
| Refund case linkage |
| Cancellation workflow |
| Emergency case log (future API) |

### APIs
| API |
| --- |
| `/api/complaints/*` |
| `/api/refunds/*` |
| `/api/bookings/:id/status` for cancellation |

## 8.21 Package Publishing Module
| Item | Spec |
| --- | --- |
| Route | `/packages` |
| Roles | Admin, Marketing, Manager |
| Purpose | Build package catalog and website publish controls |

### Package Fields
| Field |
| --- |
| Package Name |
| Destination |
| Duration |
| Starting Price |
| Inclusions |
| Exclusions |
| Day-wise itinerary |
| Hotel details |
| Validity period |
| Cancellation policy |
| Category |
| Banner image |
| Gallery images |
| SEO title |
| SEO description |
| Keywords |
| Package status |
| Publish to Website toggle |

### API Status
| Status |
| --- |
| Dedicated package publishing backend APIs pending |

## 8.22 Integration Settings Page
| Item | Spec |
| --- | --- |
| Route | `/settings/integrations` |
| Roles | Admin |
| Purpose | Configure Meta, WhatsApp, email, and webhook credentials |

### Fields
| Field |
| --- |
| Meta App ID |
| Meta Access Token |
| WhatsApp API token |
| SMTP or SendGrid credentials |
| Webhook URLs |
| Connection test results |

### API Status
| Status |
| --- |
| Config CRUD and test APIs pending |

## 8.23 Reports Hub Page
| Item | Spec |
| --- | --- |
| Route | `/reports` |
| Roles | Manager, Admin, Management, Marketing (subset) |
| Purpose | All analytics and export reports |

### Reports
| Report | API |
| --- | --- |
| Leads by source | `/api/reports/leads/by-source` |
| Leads by consultant | `/api/reports/leads/by-consultant` |
| Lead aging | `/api/reports/leads/aging` |
| Lost lead report | `/api/reports/leads/lost` |
| Revenue by month | `/api/reports/revenue/monthly` |
| Revenue by service type | `/api/reports/revenue/by-service-type` |
| Revenue by destination | `/api/reports/revenue/by-destination` |
| Sales target vs achievement | `/api/reports/sales/target-vs-achievement` |
| Outstanding payment report | `/api/reports/payments/outstanding` |
| Payment mode report | `/api/reports/payments/mode` |
| Profit margin report | `/api/reports/profit/margin` |
| Visa summary | `/api/reports/visa/summary` |
| Follow-up today | `/api/reports/followups/today` |
| Missed follow-ups | `/api/reports/followups/missed` |
| Call log | `/api/reports/followups/call-log` |
| Monthly summary | `/api/reports/monthly-summary` |
| Executive KPI | `/api/reports/dashboard/executive-kpis` |
| Conversion funnel | `/api/reports/funnel/conversion` |
| Marketing performance | `/api/reports/marketing/performance` |
| Supplier performance | `/api/reports/suppliers/performance` |
| Pipeline forecast | `/api/reports/forecast/pipeline` |

## 8.24 Notifications Center
| Item | Spec |
| --- | --- |
| Route | global drawer or `/notifications` |
| Roles | All authorized users |
| Purpose | Event-driven updates and reminders |

### APIs
| API |
| --- |
| `GET /api/notifications` |
| `GET /api/notifications/unread-count` |
| `PATCH /api/notifications/:id/read` |
| `PATCH /api/notifications/read-all` |

## 9. Finance Mapping Coverage (New Client Requirement)

## 9.1 Client Onboarding at Lead Time
Capture in `Lead Create` and `Customer Profile`:
1. PAN
2. Address
3. Email ID
4. Contact Number

Mapped fields:
| Business Field | Frontend Field | Current Backend |
| --- | --- | --- |
| PAN | `panNumber` | Supported |
| Address | `addressLine` | Supported |
| Email | `email` | Supported |
| Contact Number | `phone` | Supported |

## 9.2 Supplier Onboarding
Capture in `Supplier Management`:
1. Supplier PAN
2. GST
3. Address
4. Invoice details for payment processing
5. Supplier email and contact

Mapped fields:
| Business Field | Frontend Field | Current Backend |
| --- | --- | --- |
| Supplier PAN | `panNumber` | Schema supported, CRUD API pending |
| GST | `gstNumber` | Schema supported, CRUD API pending |
| Address | `address` | Schema supported, CRUD API pending |
| Invoice details | `invoiceBillingName`, tax IDs, bank fields | Partial schema support, API pending |
| Contact | `email`, `phone` | Schema supported, API pending |

## 9.3 Cost Break-up Details
Capture in `Quotation Builder` and `Booking Detail`:
1. Supplier cost with tax break-up
2. Markup
3. Service fee
4. GST
5. TCS
6. Total sale value

Mapped fields:
| Business Field | Frontend Field | Current Backend |
| --- | --- | --- |
| Supplier Cost | `supplierCost` | Supported |
| Supplier Tax Break-up | `supplierTaxAmount` | Supported |
| Markup | `markupAmount` | Supported |
| Service Fee | `serviceFeeAmount` | Supported |
| GST | `gstAmount` | Supported |
| TCS | `tcsAmount` | Supported |
| Total Sale Value | `finalPrice` derived in quote and `totalAmount` in booking | Supported |

## 9.4 Mode of Payment
Capture in `Payments`:
1. Cash
2. Bank Transfer
3. Payment Gateway

Mapped field:
| Business Field | Frontend Field | Current Backend |
| --- | --- | --- |
| Payment mode | `paymentMode` | Supported |

## 9.5 Currency Mapping
Capture in lead/customer/supplier/quotation/booking:
1. Client registered currency
2. Supplier registered currency

Mapped fields:
| Business Field | Frontend Field | Current Backend |
| --- | --- | --- |
| Client Currency | `clientCurrency` | Supported |
| Supplier Currency | `supplierCurrency` | Supported in booking/quotation, supplier API pending |

## 10. API Readiness Matrix
| Module | Frontend Spec | Backend Status |
| --- | --- | --- |
| Auth and RBAC | Complete | Available |
| Leads and Follow-up | Complete | Available |
| Webhook Lead Capture | Complete | Available |
| Quotation Engine | Complete | Available |
| Bookings | Complete | Available |
| Payments | Complete | Available |
| Refunds | Complete | Available |
| Visa | Complete | Available |
| Reports | Complete | Available |
| Notifications | Complete | Available |
| Customers | Complete | Available |
| Campaigns | Complete | Available |
| Complaints | Complete | Available |
| Supplier CRUD | Complete UI spec | Pending API |
| Package Publishing | Complete UI spec | Pending API |
| Employee attendance and leave | Complete UI spec | Pending API |
| Integration Settings | Complete UI spec | Pending API |
| Marketing bulk messaging | Complete UI spec | Pending API |

## 11. Frontend Build Plan (Execution Order)
1. Auth bootstrap and role guards.
2. Dashboards by role (admin/manager/sales).
3. Leads list/detail plus follow-ups.
4. Quotations list/builder/templates.
5. Bookings/payments/refunds.
6. Visa list/detail/documents/checklist.
7. Customers and campaigns.
8. Complaints and operations.
9. Reports hub and management summary.
10. Notifications.
11. Supplier and package modules (feature-flagged until APIs ready).
12. Integrations and marketing automation (feature-flagged until APIs ready).

## 12. Client Approval Checklist
| Area | Criteria | Signoff |
| --- | --- | --- |
| Navigation | All required pages and role menus present | ☐ |
| Lead lifecycle UI | Capture, assign, follow-up, SLA indicators | ☐ |
| Quotation flow UI | Builder, send, PDF, status transitions | ☐ |
| Booking and payment UI | Booking conversion, payment verify, invoice | ☐ |
| Visa operations UI | Case status, documents, checklist | ☐ |
| Reports UI | KPI, funnel, revenue, source, monthly summary | ☐ |
| Finance mapping UI | PAN, address, supplier tax fields, cost breakup, currency | ☐ |
| Operations UI | Complaints and refund process | ☐ |
| Marketing UI | Campaign analytics and segmentation | ☐ |
| Pending modules visibility | Supplier and package modules clearly planned | ☐ |

## 13. Pending Items for Final Production UX
1. Finalize supplier CRUD APIs and connect supplier pages.
2. Implement package publishing APIs and website sync actions.
3. Implement integration settings APIs with secure storage.
4. Implement bulk WhatsApp and email automation APIs.
5. Implement attendance and leave APIs for employee management.
