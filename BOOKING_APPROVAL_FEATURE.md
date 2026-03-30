# Booking Approval Feature

## Overview
Added a booking approval system where bookings must be approved before payments can be created. The `is_approved` boolean column in the bookings table controls this behavior.

## Database Changes

### Migration: `026_booking_approval.sql`
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_is_approved ON bookings(is_approved);
```

- **Column**: `is_approved` (BOOLEAN, DEFAULT FALSE)
- **Index**: Added for faster filtering by approval status
- **Default**: All existing bookings will have `is_approved = FALSE`

## API Changes

### New Endpoint: Approve Booking
**POST** `/api/bookings/:id/approve`

**Authentication**: Required  
**Authorization**: `bookings:update` permission

**Request**:
```json
{
  // No body required, just the booking ID in the URL
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "quotationId": "uuid",
    "leadId": "uuid",
    "bookingNumber": "BK-1234567890-5678",
    "travelStartDate": "2024-01-15",
    "travelEndDate": "2024-01-25",
    "totalAmount": 150000,
    "costAmount": 120000,
    "profitAmount": 30000,
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "advanceRequired": 75000,
    "advanceReceived": 0,
    "isApproved": true,
    "isDeleted": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-02T15:30:00.000Z"
  }
}
```

**Error Responses**:
- **404 Not Found**: Booking not found
- **409 Conflict**: Booking is already approved
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User lacks `bookings:update` permission

## Business Logic

### Approval Flow
1. Booking is created with `is_approved = FALSE` by default
2. Admin/Manager calls the approve endpoint
3. System checks if booking is already approved
4. If not approved, sets `is_approved = TRUE`
5. Emits booking updated event
6. Returns updated booking with deadline insights

### Payment Creation Requirement
- **Before Approval**: Payments can only be created for approved bookings
- **After Approval**: Payment entries can be made in the payments table
- This ensures proper authorization before financial transactions

## Code Changes

### 1. Service Layer (`bookings.service.js`)
Added `approve()` method:
```javascript
async approve(id, context = {}) {
  const booking = await getById(id, context);

  if (booking.isApproved) {
    throw new AppError(
      409,
      "Booking is already approved",
      "BOOKING_ALREADY_APPROVED",
    );
  }

  const updated = await repository.update(id, {
    is_approved: true,
    updated_at: new Date().toISOString(),
  });

  const hydrated = withDeadlineInsights(updated);
  events.emitUpdated(hydrated);

  return hydrated;
}
```

### 2. Controller Layer (`bookings.controller.js`)
Added `approve()` handler:
```javascript
async approve(req, res) {
  const result = await service.approve(
    req.validated.params.id,
    req.context,
  );
  res.status(200).json({ data: result });
}
```

### 3. Routes Layer (`bookings.routes.js`)
Added route:
```javascript
router.post(
  "/:id/approve",
  requireAuth,
  authorize("bookings:update"),
  validateRequest(validation.byId),
  asyncHandler(controller.approve),
);
```

### 4. Repository Layer (`bookings.repository.js`)
Updated `toBooking()` mapper to include:
```javascript
isApproved: toBoolean(row.is_approved ?? row.isApproved, false),
```

## Usage Example

### 1. Create a Booking
```bash
POST /api/bookings
{
  "quotationId": "uuid",
  "travelStartDate": "2024-01-15",
  "travelEndDate": "2024-01-25",
  "totalAmount": 150000,
  "costAmount": 120000,
  "advanceRequired": 75000
}
# Response: booking created with is_approved = false
```

### 2. Approve the Booking
```bash
POST /api/bookings/{booking-id}/approve
# Response: booking with is_approved = true
```

### 3. Create Payment (Only After Approval)
```bash
POST /api/payments
{
  "bookingId": "{booking-id}",
  "amount": 75000,
  "paymentMode": "BANK_TRANSFER"
}
# This will only work if booking.isApproved = true
```

## Testing Checklist

- [ ] Create booking - verify `is_approved = FALSE`
- [ ] Approve booking - verify `is_approved = TRUE`
- [ ] Try to approve already approved booking - verify 409 error
- [ ] Try to approve non-existent booking - verify 404 error
- [ ] Verify payment creation requires approved booking
- [ ] Check that approval emits booking updated event
- [ ] Verify authorization check for `bookings:update` permission
- [ ] Test with different user roles (admin, manager, agent)

## Database Migration

To apply the migration:
```bash
# Run the migration script
psql -U your_user -d your_database -f backend/database/migrations/026_booking_approval.sql
```

Or if using a migration tool, ensure `026_booking_approval.sql` is executed.

## Notes

- **Backward Compatibility**: All existing bookings will have `is_approved = FALSE` after migration
- **Manual Approval**: Existing bookings may need manual approval if required
- **Event Emission**: Approval triggers `bookings.updated` event for notifications
- **Idempotency**: Approving an already approved booking returns 409 error
- **Soft Delete**: Approval respects soft delete - deleted bookings cannot be approved
