# API Contract v1

## 1. Standards
- Base URL: `/api`
- Auth: `Authorization: Bearer <JWT>`
- Content-Type: `application/json`
- Time format: ISO-8601 UTC
- IDs: UUID

Response envelope:
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

## 2. Auth & RBAC

### POST `/api/auth/register`
Create user account.
Request:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123",
  "role": "agent"
}
```
Response: token + user profile.

### POST `/api/auth/login`
Request:
```json
{
  "email": "john@example.com",
  "password": "StrongPass123"
}
```
Response: token + user profile.

### GET `/api/auth/me`
Returns logged-in user profile.

### POST `/api/rbac/assign`
Assign role to user.
Request:
```json
{
  "userId": "<uuid>",
  "role": "sales_manager"
}
```

### GET `/api/rbac/me/permissions`
Returns effective role list and permissions.

## 3. Leads

### POST `/api/leads`
Create lead.
Required fields (v1):
- `name`
Optional:
- `status`, `metadata`

### GET `/api/leads`
List leads with optional filters:
- `page`, `limit`, `status`

### GET `/api/leads/:id`
Get lead by ID.

### PATCH `/api/leads/:id`
Update lead.

Planned Sprint 1/2 extensions:
- `POST /api/leads/:id/activities`
- `POST /api/leads/:id/followups`
- `PATCH /api/leads/:id/status`
- `POST /api/leads/distribute`
- `POST /api/leads/:id/reassign`

## 4. Quotations

### POST `/api/quotations`
Create quotation.

### GET `/api/quotations`
List quotations.

### GET `/api/quotations/:id`
Get quotation by ID.

### PATCH `/api/quotations/:id`
Update quotation.

Planned extensions:
- `POST /api/quotations/:id/items`
- `POST /api/quotations/:id/send`
- `POST /api/quotations/:id/generate-pdf`
- `GET /api/quotations/:id/views`

## 5. Bookings

### POST `/api/bookings`
Create booking record.

### GET `/api/bookings`
List bookings.

### GET `/api/bookings/:id`
Get booking by ID.

### PATCH `/api/bookings/:id`
Update booking.

Planned extensions:
- `POST /api/bookings/convert/:quotationId`
- `PATCH /api/bookings/:id/status`

## 6. Payments

### POST `/api/payments`
Create payment.

### GET `/api/payments`
List payments.

### GET `/api/payments/:id`
Get payment by ID.

### PATCH `/api/payments/:id`
Update payment.

Planned extensions:
- `PATCH /api/payments/:id/verify`
- `POST /api/invoices/generate/:bookingId`

## 7. Refunds

### POST `/api/refunds`
Create refund case.

### GET `/api/refunds`
List refunds.

### GET `/api/refunds/:id`
Get refund by ID.

### PATCH `/api/refunds/:id`
Update refund.

Planned extension:
- `PATCH /api/refunds/:id/status`

## 8. Visa

### POST `/api/visa`
Create visa case.

### GET `/api/visa`
List visa cases.

### GET `/api/visa/:id`
Get visa case by ID.

### PATCH `/api/visa/:id`
Update visa case.

Planned extensions:
- `PATCH /api/visa/:id/status`
- `POST /api/visa/:id/documents`
- `PATCH /api/documentation-checklist/:bookingId`

## 9. Customers

### POST `/api/customers`
Create customer.

### GET `/api/customers`
List customers.

### GET `/api/customers/:id`
Get customer by ID.

### PATCH `/api/customers/:id`
Update customer.

Planned extension:
- `POST /api/customers/:id/segment`

## 10. Campaigns

### POST `/api/campaigns`
Create campaign.

### GET `/api/campaigns`
List campaigns.

### GET `/api/campaigns/:id`
Get campaign by ID.

### PATCH `/api/campaigns/:id`
Update campaign.

Planned extension:
- `GET /api/campaigns/performance`

## 11. Complaints

### POST `/api/complaints`
Create complaint.

### GET `/api/complaints`
List complaints.

### GET `/api/complaints/:id`
Get complaint by ID.

### PATCH `/api/complaints/:id`
Update complaint.

Planned extension:
- `POST /api/complaints/:id/activities`

## 12. Users

### POST `/api/users`
Create user profile.

### GET `/api/users`
List users.

### GET `/api/users/:id`
Get user by ID.

### PATCH `/api/users/:id`
Update user profile.

## 13. Reporting (Planned)
- `GET /api/reports/dashboard`
- `GET /api/reports/funnel`
- `GET /api/reports/consultants`
- `GET /api/reports/source-performance`
- `GET /api/reports/monthly-summary`
- `GET /api/reports/export`

## 14. Webhooks (Planned)
- `POST /api/webhooks/meta-leads`
- `POST /api/webhooks/website-enquiry`
- `POST /api/webhooks/whatsapp-enquiry`

## 15. Permission Naming Convention
Pattern: `<module>:<action>`
Examples:
- `leads:read`
- `leads:create`
- `quotations:update`
- `payments:verify`
- `reports:read`

## 16. Versioning & Compatibility
- Current version: `v1` (URI currently unprefixed)
- Backward-compatible changes:
  - Add optional fields
  - Add new endpoints
- Breaking changes require:
  - new version namespace (`/api/v2/...`) or explicit migration plan
