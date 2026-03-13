# Frontend Build Spec v1 (Backend-Aligned)

> Primary source of truth for client approval and complete frontend scope:
> `docs/frontend-page-specs.md` (Frontend Master Specification v2.0)
>
> This file is kept as backend-aligned implementation reference.

## 1. Purpose
This document defines exactly what frontend pages to build, what fields each page needs, and how each screen connects to backend APIs and other modules.

Scope is aligned with current backend implementation in `travel-crm/src/modules/*`.

For page-by-page UI execution from scratch (screen layout + fields + actions), use:
- `docs/frontend-page-specs.md`

## 2. Global Standards

### 2.1 API and Auth
| Item | Value |
| --- | --- |
| Base URL | `/api` |
| Auth Type | JWT Bearer token |
| Auth Header | `Authorization: Bearer <token>` |
| Public Endpoints | `/health`, `/api/auth/register`, `/api/auth/login`, `/api/webhooks/*`, `/api/quotations/:id/viewed` |

### 2.2 Response Shape
| Type | Shape |
| --- | --- |
| Success | `{ "data": ... }` |
| Error | `{ "error": { "message", "code", "details", "requestId" } }` |

### 2.3 Common Field Rules
| Field Type | Rule |
| --- | --- |
| UUID | standard UUID string |
| Date | `YYYY-MM-DD` |
| Date-Time | ISO timestamp string |
| Currency Code | 3 to 10 chars (`INR`, `AED`, etc.) |
| Pagination | `page`, `limit` query params |

## 3. Entity Connection Map

Use these links in UI navigation and data dependency:

1. `Campaign -> Leads` via `lead.campaignId`
2. `Customer -> Leads` via customer profile and lead capture
3. `Lead -> Quotation` via `quotation.leadId`
4. `Quotation -> Booking` via `booking.quotationId`
5. `Booking -> Payments` via `payment.bookingId`
6. `Payment -> Refund` via `refund.paymentId`
7. `Booking -> Visa Case` via `visaCase.bookingId`
8. `Visa Case -> Visa Documents` via `visa_documents.visa_case_id`
9. `Booking -> Complaint` via `complaint.bookingId`
10. All core events -> `Notifications` module
11. All modules -> `Reports` module aggregates

## 4. Frontend Page Inventory

## 4.1 Authentication
| Page | Route | API |
| --- | --- | --- |
| Login | `/login` | `POST /api/auth/login` |
| Register (admin/internal only) | `/register` | `POST /api/auth/register` |
| Profile bootstrap | app init | `GET /api/auth/me`, `GET /api/rbac/me/permissions` |

## 4.2 Core CRM Pages
| Page | Route | API Group |
| --- | --- | --- |
| Dashboard | `/dashboard` | `/api/reports/*`, `/api/notifications/unread-count` |
| Leads List | `/leads` | `/api/leads` |
| Lead Detail | `/leads/:id` | `/api/leads/:id`, follow-up and assign APIs |
| Customers | `/customers` | `/api/customers` |
| Campaigns | `/campaigns` | `/api/campaigns` |
| Quotations List | `/quotations` | `/api/quotations` |
| Quotation Builder | `/quotations/new`, `/quotations/:id` | quotation create/update/send/status APIs |
| Bookings | `/bookings` | `/api/bookings` |
| Payments | `/payments` | `/api/payments` |
| Refunds | `/refunds` | `/api/refunds` |
| Visa Cases | `/visa` | `/api/visa` |
| Complaints | `/complaints` | `/api/complaints` |
| Reports | `/reports/*` | `/api/reports/*` |
| Notifications | header panel or `/notifications` | `/api/notifications/*` |
| User Management | `/users` | `/api/users`, `/api/rbac/assign` |

## 5. Page-Wise Form Contracts

## 5.1 Login Page
### Inputs
| Key | Label | Type | Required | Validation |
| --- | --- | --- | --- | --- |
| `email` | Email | email | Yes | valid email |
| `password` | Password | password | Yes | min 8 |
| `rememberMe` | Remember Me | checkbox | No | UI-only |

### Actions
1. Submit -> `POST /api/auth/login`
2. Save token in secure storage
3. Fetch permissions -> `GET /api/rbac/me/permissions`
4. Redirect based on permission set

## 5.2 Users Page (Admin)
### Create/Update Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `fullName` | text | Yes | 2-150 chars |
| `email` | email | Yes | valid email |
| `phone` | text | No | 6-20 chars |
| `roleId` | select(UUID) | No | valid UUID |
| `passwordHash` | password | Yes | min 8 |
| `isActive` | switch | No | boolean |
| `isOnLeave` | switch | No | boolean |
| `expertiseDestinations` | multi-tag | No | max 50 |
| `targetAmount` | number | No | >= 0 |
| `incentivePercent` | number | No | 0-100 |

### APIs
| Action | Endpoint |
| --- | --- |
| List users | `GET /api/users?page&limit&roleId&email&isActive&isOnLeave` |
| Create user | `POST /api/users` |
| Update user | `PATCH /api/users/:id` |
| Assign role | `POST /api/rbac/assign` |

## 5.3 Campaigns Page
### Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `name` | text | Yes | 2-150 |
| `source` | select/text | No | 2-100 |
| `budget` | number | No | >= 0 |
| `actualSpend` | number | No | >= 0 |
| `leadsGenerated` | number | No | int >= 0 |
| `revenueGenerated` | number | No | >= 0 |
| `metaCampaignId` | text | No | <=100 |
| `metaAdsetId` | text | No | <=100 |
| `metaAdId` | text | No | <=100 |
| `startDate` | date | No | valid date |
| `endDate` | date | No | >= `startDate` |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/campaigns` |
| Get one | `GET /api/campaigns/:id` |
| Create | `POST /api/campaigns` |
| Update | `PATCH /api/campaigns/:id` |

## 5.4 Customers Page
### Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `fullName` | text | Yes | 2-150 |
| `phone` | text | No | 6-20 |
| `email` | email | No | valid email |
| `preferences` | textarea | No | <=5000 |
| `lifetimeValue` | number | No | >=0 |
| `segment` | select | No | `PLATINUM/GOLD/SILVER/NEW` |
| `panNumber` | text | No | 5-20 |
| `addressLine` | textarea | No | <=2000 |
| `clientCurrency` | text/select | No | 3-10 |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/customers` |
| Get one | `GET /api/customers/:id` |
| Create | `POST /api/customers` |
| Update | `PATCH /api/customers/:id` |

## 5.5 Leads Pages
### Lead Create/Update Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `fullName` | text | Yes | min 2 |
| `phone` | text | No | 6-20 |
| `email` | email | No | valid email |
| `panNumber` | text | No | 8-20 |
| `addressLine` | textarea | No | 5-2000 |
| `clientCurrency` | text/select | No | 3-10 |
| `destinationId` | select(UUID) | No | UUID |
| `travelDate` | date | No | valid date |
| `budget` | number | No | >=0 |
| `source` | select/text | No | 2-100 |
| `campaignId` | select(UUID) | No | UUID |
| `utmSource` | text | No | <=100 |
| `utmMedium` | text | No | <=100 |
| `utmCampaign` | text | No | <=100 |
| `respondedPositively` | switch | No | boolean |
| `priorityLevel` | number | No | int >=0 |
| `isVip` | switch | No | boolean |
| `status` | select | No | `OPEN/CONTACTED/WIP/QUOTED/FOLLOW_UP/CONVERTED/LOST` |
| `assignedTo` | select(UUID) | No | UUID |
| `qualificationCompleted` | switch | No | boolean |
| `closedReason` | textarea | Conditional | required if `status=LOST` |
| `nextFollowupDate` | date | No | valid date |
| `notes` | textarea | No | <=2000 |
| `autoAssign` | switch | No | boolean |

### Follow-up Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `followupDate` | datetime | Yes | valid datetime |
| `followupType` | select | No | `CALL/WHATSAPP/EMAIL/FINAL_REMINDER/TASK` |
| `userId` | select(UUID) | No | UUID |
| `notes` | textarea | No | <=2000 |

### Lead Actions and APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/leads` |
| Create | `POST /api/leads` |
| Update | `PATCH /api/leads/:id` |
| Auto distribute | `POST /api/leads/distribute` |
| Reassign inactive | `POST /api/leads/reassign-inactive` |
| Assign single lead | `POST /api/leads/:id/assign` |
| Create follow-up | `POST /api/leads/:id/followups` |
| Overdue list | `GET /api/leads/followups/overdue` |
| Process overdue | `POST /api/leads/followups/process-overdue` |
| Process SLA breaches | `POST /api/leads/sla/process-breaches` |

### Webhook Capture (Public, no login)
| Source | Endpoint |
| --- | --- |
| Meta lead ads | `POST /api/webhooks/meta-leads` |
| Website enquiry | `POST /api/webhooks/website-enquiry` |
| WhatsApp enquiry | `POST /api/webhooks/whatsapp-enquiry` |

Minimum identity in webhook payload: one of `fullName/name/email/phone`.

## 5.6 Quotations Pages
### Quotation Core Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `leadId` | select(UUID) | Yes | UUID |
| `parentQuoteId` | select(UUID) | No | UUID |
| `templateId` | select(UUID) | No | UUID |
| `pricingId` | select(UUID) | No | UUID |
| `components[]` | repeater | Yes | at least 1 item |
| `components[].itemType` | select | Yes | `HOTEL/FLIGHT/TRANSFER/VISA/INSURANCE/OTHER` |
| `components[].description` | text | Yes | 1-1000 |
| `components[].cost` | number | Yes | >=0 |
| `marginPercent` | number | Yes | 0-100 |
| `minMarginPercent` | number | No | 0-100 |
| `discount` | number | No | >=0 |
| `taxPercent` | number | No | 0-100 |
| `taxAmount` | number | No | >=0 |
| `supplierCost` | number | No | >=0 |
| `supplierTaxAmount` | number | No | >=0 |
| `markupAmount` | number | No | >=0 |
| `serviceFeeAmount` | number | No | >=0 |
| `gstAmount` | number | No | >=0 |
| `tcsAmount` | number | No | >=0 |
| `costCurrency` | text/select | No | 3-10 |
| `clientCurrency` | text/select | No | 3-10 |
| `supplierCurrency` | text/select | No | 3-10 |
| `expiresInHours` | number | No | int 1-720 |

### Send/Status Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `channel` | select | No | `EMAIL/WHATSAPP/MANUAL` |
| `recipientEmail` | email | No | valid email |
| `recipientPhone` | text | No | 6-25 |
| `message` | textarea | No | <=1000 |
| `status` | select | Yes for status API | `APPROVED/REJECTED` |
| `reason` | textarea | Conditional | required when `REJECTED` |
| `travelStartDate` | date | No | valid date |
| `travelEndDate` | date | No | valid date |

### Template Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `code` | text | Yes | 2-50 |
| `name` | text | Yes | 2-150 |
| `templateType` | select | Yes | `READY_PACKAGE/VISA/CUSTOM_ITINERARY` |
| `headerBranding` | textarea | No | <=4000 |
| `inclusions` | textarea | No | <=8000 |
| `exclusions` | textarea | No | <=8000 |
| `paymentTerms` | textarea | No | <=4000 |
| `cancellationPolicy` | textarea | No | <=4000 |
| `footerDisclaimer` | textarea | No | <=4000 |
| `minMarginPercent` | number | No | 0-100 |
| `isActive` | switch | No | boolean |

### APIs
| Action | Endpoint |
| --- | --- |
| List quotes | `GET /api/quotations` |
| Get quote | `GET /api/quotations/:id` |
| Create quote | `POST /api/quotations` |
| Update quote | `PATCH /api/quotations/:id` |
| Track quote viewed | `POST /api/quotations/:id/viewed` |
| Quote view log | `GET /api/quotations/:id/views` |
| Generate PDF | `POST /api/quotations/:id/generate-pdf` |
| Send quote | `POST /api/quotations/:id/send` |
| Approve margin | `POST /api/quotations/:id/approve-margin` |
| Status transition | `POST /api/quotations/:id/status` |
| Versions list | `GET /api/quotations/:id/versions` |
| Send logs | `GET /api/quotations/:id/send-logs` |
| Run reminders | `POST /api/quotations/reminders/run` |
| Lead-to-quote report | `GET /api/quotations/reports/lead-to-quote` |
| Template list | `GET /api/quotations/templates` |
| Template create | `POST /api/quotations/templates` |
| Template update | `PATCH /api/quotations/templates/:id` |

## 5.7 Bookings Pages
### Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `quotationId` | select(UUID) | Yes | UUID |
| `bookingNumber` | text | No | 3-50 |
| `travelStartDate` | date | Yes | valid date |
| `travelEndDate` | date | Yes | >= start date |
| `totalAmount` | number | Yes | >=0 |
| `costAmount` | number | Yes | >=0 and <= totalAmount |
| `isNonRefundable` | switch | No | boolean |
| `advanceRequired` | number | No | >=0 |
| `clientCurrency` | text/select | No | 3-10 |
| `supplierCurrency` | text/select | No | 3-10 |
| `exchangeRate` | number | No | >0 |
| `exchangeLocked` | switch | No | boolean |
| `paymentStatus` | select (update) | No | `PENDING/PARTIAL/FULL/REFUNDED` |
| `cancellationReason` | textarea | Conditional | required when status `CANCELLED` |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/bookings` |
| Get one | `GET /api/bookings/:id` |
| Create | `POST /api/bookings` |
| Update | `PATCH /api/bookings/:id` |
| Transition status | `POST /api/bookings/:id/status` |
| Status history | `GET /api/bookings/:id/status-history` |
| List invoices | `GET /api/bookings/:id/invoices` |
| Generate invoice | `POST /api/bookings/:id/invoices/generate` |

## 5.8 Payments Pages
### Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `bookingId` | select(UUID) | Yes | UUID |
| `amount` | number | Yes | >0 |
| `currency` | text/select | No | 3-10 |
| `paymentMode` | select | Yes | `CASH/BANK_TRANSFER/PAYMENT_GATEWAY/UPI/CARD/BANK/GATEWAY` |
| `gatewayProvider` | text | No | 2-50 |
| `gatewayOrderId` | text | No | 2-150 |
| `gatewayPaymentId` | text | No | 2-150 |
| `gatewaySignature` | text | No | 2-4000 |
| `paymentReference` | text | No | 2-100 |
| `proofUrl` | url | No | valid URL |
| `status` | select | No | `PENDING/PARTIAL/FULL/REFUNDED` |
| `paidAt` | datetime | No | valid datetime |
| `isVerified` | switch | No | boolean |

### Verify Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `paidAt` | datetime | No | valid datetime |
| `status` | select | No | payment status enum |
| `proofUrl` | url | No | valid URL |
| `paymentReference` | text | No | 2-100 |
| `gatewayPaymentId` | text | No | 2-150 |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/payments` |
| Get one | `GET /api/payments/:id` |
| Create | `POST /api/payments` |
| Update | `PATCH /api/payments/:id` |
| Verify | `POST /api/payments/:id/verify` |

## 5.9 Refunds Pages
### Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `bookingId` | select(UUID) | Yes | UUID |
| `paymentId` | select(UUID) | No | UUID |
| `refundAmount` | number | Yes | >0 |
| `supplierPenalty` | number | No | >=0 |
| `serviceCharge` | number | No | >=0 |
| `gatewayRefundId` | text | No | 2-150 |

### Workflow Inputs
| Action | Input |
| --- | --- |
| Approve | optional `note`, `approvedAt` |
| Reject | optional `reason`, `rejectedAt` |
| Process | optional `gatewayRefundId`, `processedAt`, `markPaymentRefunded` |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/refunds` |
| Get one | `GET /api/refunds/:id` |
| Create | `POST /api/refunds` |
| Update | `PATCH /api/refunds/:id` |
| Approve | `POST /api/refunds/:id/approve` |
| Reject | `POST /api/refunds/:id/reject` |
| Process | `POST /api/refunds/:id/process` |

## 5.10 Visa Pages
### Visa Case Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `bookingId` | select(UUID) | No | UUID |
| `supplierId` | select(UUID) | No | UUID |
| `country` | text | Yes | 2-100 |
| `visaType` | text/select | Yes | 2-100 |
| `visaNumber` | text | No | <=100 |
| `fees` | number | No | >=0 |
| `appointmentDate` | date | No | valid date |
| `submissionDate` | date | No | valid date |
| `status` | select | No | `DOCUMENT_PENDING/SUBMITTED/APPROVED/REJECTED` |
| `rejectionReason` | textarea | No | <=2000 |
| `visaValidUntil` | date | No | valid date |

### Status Transition Inputs
| Key | Type | Required | Rule |
| --- | --- | --- | --- |
| `status` | select | Yes | visa status enum |
| `rejectionReason` | textarea | Conditional | required when `REJECTED` |
| `visaValidUntil` | date | Conditional | required when `APPROVED` |
| `submissionDate` | date | No | valid date |
| `visaNumber` | text | No | <=100 |
| `note` | textarea | No | <=2000 |

### Document Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `documentType` | text/select | Yes | 2-100 |
| `fileUrl` | url/text | Yes | 5-2000 |
| `isVerified` | switch | No | boolean |

### Checklist Inputs
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
| Action | Endpoint |
| --- | --- |
| List cases | `GET /api/visa` |
| Get case | `GET /api/visa/:id` |
| Create case | `POST /api/visa` |
| Update case | `PATCH /api/visa/:id` |
| Transition status | `POST /api/visa/:id/status` |
| List documents | `GET /api/visa/:id/documents` |
| Add document | `POST /api/visa/:id/documents` |
| Verify document | `PATCH /api/visa/documents/:documentId/verify` |
| Get checklist | `GET /api/visa/:id/checklist` |
| Update checklist | `PATCH /api/visa/:id/checklist` |
| Visa summary report | `GET /api/visa/reports/summary` |

## 5.11 Complaints Pages
### Inputs
| Key | Type | Required on Create | Validation |
| --- | --- | --- | --- |
| `bookingId` | select(UUID) | No | UUID |
| `assignedTo` | select(UUID) | No | UUID |
| `issueType` | text/select | Yes | 2-150 |
| `description` | textarea | Yes | 5-4000 |
| `status` | select | No | `OPEN/IN_PROGRESS/RESOLVED` |

### Activity Inputs
| Key | Type | Required | Validation |
| --- | --- | --- | --- |
| `note` | textarea | Yes | 2-2000 |
| `userId` | select(UUID) | No | UUID |

### APIs
| Action | Endpoint |
| --- | --- |
| List | `GET /api/complaints` |
| Get one | `GET /api/complaints/:id` |
| Create | `POST /api/complaints` |
| Update | `PATCH /api/complaints/:id` |
| List activities | `GET /api/complaints/:id/activities` |
| Create activity | `POST /api/complaints/:id/activities` |

## 5.12 Notifications
| Action | Endpoint |
| --- | --- |
| List mine | `GET /api/notifications` |
| Unread count | `GET /api/notifications/unread-count` |
| Mark one read | `PATCH /api/notifications/:id/read` |
| Mark all read | `PATCH /api/notifications/read-all` |

## 5.13 Reports
### Common Filter Inputs
| Key | Type | Note |
| --- | --- | --- |
| `from` | date | optional |
| `to` | date | optional |
| `userId` | select(UUID) | applicable endpoints only |
| `date` | date | follow-up reports |
| `supplierId` | select(UUID) | supplier performance |
| `periodMonths` | number | pipeline forecast (1-12) |

### Endpoints
| Group | Endpoint |
| --- | --- |
| Leads | `/api/reports/leads/by-source`, `/api/reports/leads/by-consultant`, `/api/reports/leads/aging`, `/api/reports/leads/lost` |
| Revenue | `/api/reports/revenue/monthly`, `/api/reports/revenue/by-service-type`, `/api/reports/revenue/by-destination` |
| Sales | `/api/reports/sales/target-vs-achievement` |
| Payments | `/api/reports/payments/outstanding`, `/api/reports/payments/mode` |
| Profit | `/api/reports/profit/margin` |
| Visa | `/api/reports/visa/summary` |
| Follow-ups | `/api/reports/followups/today`, `/api/reports/followups/missed`, `/api/reports/followups/call-log` |
| Executive | `/api/reports/monthly-summary`, `/api/reports/dashboard/executive-kpis`, `/api/reports/funnel/conversion` |
| Marketing and supplier | `/api/reports/marketing/performance`, `/api/reports/suppliers/performance` |
| Forecast | `/api/reports/forecast/pipeline` |

## 6. Cross-Page Flow (How Pages Connect)

1. Lead capture starts via webhook or manual lead creation.
2. Lead gets assigned (`autoAssign` or assign API).
3. Sales works lead timeline and follow-ups.
4. Quotation created from selected lead (`leadId` mandatory).
5. Quotation sent and tracked; customer action updates status.
6. Approved quotation leads to booking creation (`quotationId`).
7. Booking receives payments (`bookingId`) and payment verification.
8. Refunds are raised from booking or payment context.
9. Visa case can be opened from booking context.
10. Complaints can be opened from booking context.
11. Reports aggregate data from all modules.
12. Notifications surface event changes across modules.

## 7. Recommended Frontend State Structure

Use one API service per module:

1. `frontend/src/api/auth.ts`
2. `frontend/src/api/users.ts`
3. `frontend/src/api/leads.ts`
4. `frontend/src/api/quotations.ts`
5. `frontend/src/api/bookings.ts`
6. `frontend/src/api/payments.ts`
7. `frontend/src/api/refunds.ts`
8. `frontend/src/api/visa.ts`
9. `frontend/src/api/campaigns.ts`
10. `frontend/src/api/customers.ts`
11. `frontend/src/api/complaints.ts`
12. `frontend/src/api/reports.ts`
13. `frontend/src/api/notifications.ts`

Use shared UI form primitives:

1. `TextInput`, `NumberInput`, `DateInput`, `DateTimeInput`
2. `CurrencyInput`, `UUIDSelect`, `MultiTagInput`
3. `StatusBadge`, `Timeline`, `AuditMeta`

## 8. UI Validation and UX Rules

1. Validate on client exactly as backend constraints before submit.
2. Show server error `message` and field-level errors from `details`.
3. Disable submit while request in progress.
4. For enums, render dropdown not free-text.
5. For foreign keys, always render searchable select from list APIs.
6. For status changes with conditional required fields, show dynamic inputs:
   - Lead `LOST` -> require `closedReason`
   - Quote `REJECTED` -> require `reason`
   - Booking `CANCELLED` -> require `cancellationReason`
   - Visa `REJECTED` -> require `rejectionReason`
   - Visa `APPROVED` -> require `visaValidUntil`

## 9. Backend Gaps to Note for Frontend Team

1. No dedicated destination module API in current backend route map.
2. No dedicated supplier CRUD module API in current backend route map.
3. Package publishing endpoints are not yet present in current backend route map.
4. Use mock/static dropdowns for above until API is exposed.

## 10. Frontend Done Criteria

Frontend should be considered complete when:

1. Every module page can list, create, update, and view details using the APIs above.
2. Cross-module navigation works for all links in Section 6.
3. Role/permission guards hide unauthorized actions.
4. Client validation mirrors backend validation rules.
5. Reports pages support filter controls and chart/table rendering.
6. Notifications panel supports unread count and read actions.
