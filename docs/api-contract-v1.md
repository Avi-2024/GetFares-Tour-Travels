# API Contract v1 (Current Implementation)

## 1. Standards
- Base URL: `/api`
- Auth: `Authorization: Bearer <JWT>` (for protected endpoints)
- Content-Type: `application/json`
- Time format: ISO-8601
- IDs: UUID where enforced by validation

Success envelope:
```json
{
  "data": {}
}
```

Error envelope:
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {},
    "requestId": "..."
  }
}
```

## 2. Health
### GET `/health`
- Public endpoint
- Returns service health metadata

### GET `/health/live`
- Public endpoint
- Liveness probe for process health

### GET `/health/ready`
- Public endpoint
- Readiness probe for dependency health
- Returns `200` when ready
- Returns `503` when dependency check fails or app is draining for shutdown

### GET `/metrics`
- Public by default, optionally token-protected via `x-metrics-token` header when `METRICS_TOKEN` is configured
- Returns Prometheus text metrics

### GET `/metrics/json`
- Public by default, optionally token-protected via `x-metrics-token` header when `METRICS_TOKEN` is configured
- Returns JSON metrics snapshot

## 3. Auth
### POST `/api/auth/register`
Request:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "919999999999",
  "password": "StrongPass123",
  "role": "sales_consultant"
}
```
Response: `201`

### POST `/api/auth/login`
Request:
```json
{
  "email": "john@example.com",
  "password": "StrongPass123"
}
```
Response: `200`

### GET `/api/auth/me`
- Protected
- Returns current user profile

## 4. RBAC
### POST `/api/rbac/assign`
- Protected: `rbac:manage`
Request:
```json
{
  "userId": "<id>",
  "role": "manager"
}
```
Response: `200`

### GET `/api/rbac/me/permissions`
- Protected
- Returns effective roles + permissions for current user

## 5. Leads
### POST `/api/leads`
- Protected: `leads:create`
Request fields:
- `fullName` (required)
- `phone`, `email`, `panNumber`, `addressLine`, `clientCurrency`
- `destinationId`, `travelDate`, `budget`
- `source`, `campaignId`, `utmSource`, `utmMedium`, `utmCampaign`
- `respondedPositively`, `priorityLevel`, `isVip`, `status`, `assignedTo`
- `qualificationCompleted`, `closedReason`, `nextFollowupDate`, `notes`
- `autoAssign`
Response: `201`

### GET `/api/leads`
- Protected: `leads:read`
Query:
- `page`, `limit`, `status`, `source`, `assignedTo`, `email`, `phone`
Response: `200`

### GET `/api/leads/:id`
- Protected: `leads:read`
Response: `200`

### PATCH `/api/leads/:id`
- Protected: `leads:update`
- If `status=LOST`, `closedReason` is required.
Response: `200`

### POST `/api/leads/:id/assign`
- Protected: `leads:update`
Request (optional):
- `force`, `excludeUserId`, `reason`, `mode`
Response: `200`

### POST `/api/leads/distribute`
- Protected: `leads:update`
Request (optional):
- `limit`, `reason`
Response: `200`

### POST `/api/leads/reassign-inactive`
- Protected: `leads:update`
Request (optional):
- `inactiveMinutes`, `limit`, `reason`
Response: `200`

### POST `/api/leads/:id/followups`
- Protected: `leads:update`
Request:
```json
{
  "userId": "<optional-user-id>",
  "followupType": "CALL",
  "followupDate": "2026-03-10T10:30:00.000Z",
  "notes": "Callback tomorrow"
}
```
Response: `201`

### GET `/api/leads/followups/overdue`
- Protected: `leads:read`
Query: `limit`
Response: `200`

### POST `/api/leads/followups/process-overdue`
- Protected: `leads:update`
Request (optional): `limit`
Response: `200`

### POST `/api/leads/sla/process-breaches`
- Protected: `leads:update`
Request (optional): `limit`
Response: `200`

## 6. Webhooks (Implemented)
All webhook endpoints are public by design.

### POST `/api/webhooks/meta-leads`
### POST `/api/webhooks/website-enquiry`
### POST `/api/webhooks/whatsapp-enquiry`
Accepted payload (minimum one identifier required):
- `fullName` or `name` or `email` or `phone`
Optional:
- `panNumber`, `addressLine`, `clientCurrency`, `budget`, `travelDate`
- `campaignId`, `utmSource`, `utmMedium`, `utmCampaign`, `source`
Response:
- `201` when new lead captured
- `200` when duplicate capture detected

## 7. Quotations
### GET `/api/quotations`
- Protected: `quotations:read`
Query:
- `page`, `limit`, `status`, `leadId`, `createdBy`, `includeItems`
Response: `200`

### GET `/api/quotations/:id`
- Protected: `quotations:read`
Response: `200`

### POST `/api/quotations`
- Protected: `quotations:create`
Request:
```json
{
  "leadId": "<uuid>",
  "parentQuoteId": "<optional-uuid>",
  "templateId": "<optional-uuid>",
  "pricingId": "<optional-uuid>",
  "components": [
    { "itemType": "HOTEL", "description": "4N hotel", "cost": 50000 }
  ],
  "marginPercent": 12,
  "minMarginPercent": 8,
  "discount": 1000,
  "taxPercent": 5,
  "taxAmount": 2500,
  "expiresInHours": 48
}
```
Response: `201`

### PATCH `/api/quotations/:id`
- Protected: `quotations:update`
Response: `200`

### POST `/api/quotations/:id/generate-pdf`
- Protected: `quotations:update`
Request (optional): `pdfUrl`
Response: `200`

### POST `/api/quotations/:id/send`
- Protected: `quotations:update`
Request (optional):
- `channel` (`EMAIL|WHATSAPP|MANUAL`)
- `recipientEmail`, `recipientPhone`, `message`, `expiresInHours`
Response: `200`

### POST `/api/quotations/:id/viewed`
- Public view tracking endpoint
Request (optional): `deviceInfo`, `userAgent`
Response: `200`

### GET `/api/quotations/:id/views`
- Protected: `quotations:read`
Query: `page`, `limit`
Response: `200`

### POST `/api/quotations/:id/approve-margin`
- Protected: `quotations:update`
Request (optional): `note`
Response: `200`

### POST `/api/quotations/:id/status`
- Protected: `quotations:update`
Request:
```json
{
  "status": "APPROVED",
  "reason": "optional when REJECTED",
  "travelStartDate": "2026-05-10",
  "travelEndDate": "2026-05-15"
}
```
Supported transitions:
- Only to `APPROVED` or `REJECTED`
- From current states `DRAFT` or `SENT`
Response: `200`

### GET `/api/quotations/reports/lead-to-quote`
- Protected: `reports:read`
Query: `from`, `to`, `createdBy`
Response: `200`

### POST `/api/quotations/reminders/run`
- Protected: `quotations:update`
Request (optional): `notOpenedHours`, `viewedNoActionHours`
Response: `200`

### GET `/api/quotations/:id/versions`
- Protected: `quotations:read`
Response: `200`

### GET `/api/quotations/:id/send-logs`
- Protected: `quotations:read`
Response: `200`

### Template endpoints
### GET `/api/quotations/templates`
- Protected: `quotations:read`
- Query: `isActive`, `templateType`, `page`, `limit`
- Current behavior: returns persisted templates.

### POST `/api/quotations/templates`
### PATCH `/api/quotations/templates/:id`
- Protected: `quotations:update`
- Current behavior: create/update template records.

## 8. Notifications
### GET `/api/notifications`
- Protected: `notifications:read`
Query: `page`, `limit`, `status`
Response: `200`

### GET `/api/notifications/unread-count`
- Protected: `notifications:read`
Response: `200`

### PATCH `/api/notifications/:id/read`
- Protected: `notifications:update`
Response: `200`

### PATCH `/api/notifications/read-all`
- Protected: `notifications:update`
Response: `200`

## 9. Bookings
### GET `/api/bookings`
### GET `/api/bookings/:id`
### POST `/api/bookings`
### PATCH `/api/bookings/:id`
- Protected via `bookings:*` permissions
- Key create fields:
  - `quotationId`, `travelStartDate`, `travelEndDate`
  - `totalAmount`, `costAmount`, `advanceRequired`
  - `clientCurrency`, `supplierCurrency`, `exchangeRate`, `exchangeLocked`

### POST `/api/bookings/:id/status`
- Protected: `bookings:update`
- Supports transition to `PENDING|CONFIRMED|CANCELLED`
- If `CANCELLED`, `cancellationReason` required
- Confirmation is guarded by payment rules in service layer

### GET `/api/bookings/:id/status-history`
### GET `/api/bookings/:id/invoices`
### POST `/api/bookings/:id/invoices/generate`
- Protected endpoints for booking lifecycle audit and invoicing

## 10. Payments
### GET `/api/payments`
### GET `/api/payments/:id`
### POST `/api/payments`
### PATCH `/api/payments/:id`
- Protected via `payments:*` permissions
- Supports payment modes:
  - `CASH`, `BANK_TRANSFER`, `PAYMENT_GATEWAY`, `UPI`, `CARD`, `BANK`, `GATEWAY`

### POST `/api/payments/:id/verify`
- Protected: `payments:update`
- Verifies payment and syncs booking payment snapshot (`advanceReceived`, `paymentStatus`)

## 11. Refunds
### GET `/api/refunds`
### GET `/api/refunds/:id`
### POST `/api/refunds`
### PATCH `/api/refunds/:id`

### POST `/api/refunds/:id/approve`
### POST `/api/refunds/:id/reject`
### POST `/api/refunds/:id/process`
- Protected via `refunds:*` permissions
- Workflow: `INITIATED -> APPROVED/REJECTED -> PROCESSED`
- High-value refund approval guard is enforced in service layer

## 12. Visa
### GET `/api/visa`
### GET `/api/visa/:id`
### POST `/api/visa`
### PATCH `/api/visa/:id`

### POST `/api/visa/:id/status`
- Protected: `visa:update`
- Supported statuses:
  - `DOCUMENT_PENDING`, `SUBMITTED`, `APPROVED`, `REJECTED`
- Rules:
  - `REJECTED` requires `rejectionReason`
  - `APPROVED` requires `visaValidUntil`

### GET `/api/visa/:id/documents`
### POST `/api/visa/:id/documents`
### PATCH `/api/visa/documents/:documentId/verify`

### GET `/api/visa/:id/checklist`
### PATCH `/api/visa/:id/checklist`

### GET `/api/visa/reports/summary`

## 13. Reports
All endpoints protected by `reports:read`.

### Lead reports
- `GET /api/reports/leads/by-source`
- `GET /api/reports/leads/by-consultant`
- `GET /api/reports/leads/aging`
- `GET /api/reports/leads/lost`

### Revenue/Sales reports
- `GET /api/reports/revenue/monthly`
- `GET /api/reports/revenue/by-service-type`
- `GET /api/reports/revenue/by-destination`
- `GET /api/reports/sales/target-vs-achievement`

### Payment/Profit reports
- `GET /api/reports/payments/outstanding`
- `GET /api/reports/payments/mode`
- `GET /api/reports/profit/margin`

### Visa/Follow-up/Management reports
- `GET /api/reports/visa/summary`
- `GET /api/reports/followups/today`
- `GET /api/reports/followups/missed`
- `GET /api/reports/followups/call-log`
- `GET /api/reports/monthly-summary`
- `GET /api/reports/dashboard/executive-kpis`
- `GET /api/reports/funnel/conversion`
- `GET /api/reports/marketing/performance`
- `GET /api/reports/suppliers/performance`
- `GET /api/reports/forecast/pipeline`

Common query filters:
- `from`, `to` (date range)
- report-specific optional keys like `userId`, `date`, `supplierId`, `periodMonths`

## 14. Business CRUD Modules (Current)
The following modules are running with PRD-oriented business payloads:
- `/api/users`
- `/api/campaigns`
- `/api/customers`
- `/api/complaints`

## 15. Permission Naming Convention
Pattern: `<module>:<action>`
Examples:
- `leads:read`
- `leads:create`
- `leads:update`
- `quotations:read`
- `quotations:create`
- `quotations:update`
- `reports:read`
- `notifications:read`
- `notifications:update`

## 16. Versioning
- Current: unprefixed `/api/*` (v1)
- Breaking changes must go to `/api/v2/*` or follow explicit migration notes.
