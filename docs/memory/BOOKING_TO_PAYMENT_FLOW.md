# Booking to Payment Flow - Travel CRM Backend

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUOTATION PHASE                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    1. Lead Created (from Meta/Manual)
                                  │
                    2. Quotation Created (DRAFT)
                       POST /api/quotations
                       ├─ Calculate Pricing (margin, tax, discount)
                       ├─ Build Template Snapshot
                       ├─ Status: DRAFT
                       └─ Event: quotations.created
                                  │
                    3. Quotation Sent to Customer
                       POST /api/quotations/:id/send
                       ├─ Generate PDF (if not exists)
                       ├─ Send Email (optional)
                       ├─ Status: DRAFT → SENT
                       ├─ Update Lead Status: QUOTED
                       └─ Event: quotations.sent
                                  │
                    4. Customer Views Quotation
                       POST /api/quotations/:id/track-view
                       ├─ Increment view_count
                       ├─ Status: SENT → VIEWED
                       └─ Event: quotations.viewed
                                  │
                    5. Customer Approves Quotation
                       POST /api/quotations/:id/status
                       ├─ Status: VIEWED → APPROVED
                       ├─ Update Lead Status: CONVERTED
                       └─ Event: quotations.status_changed
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BOOKING PHASE                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    6. Booking Created from Approved Quotation
                       POST /api/bookings
                       ├─ Validate: Quotation must be APPROVED
                       ├─ Calculate: advanceRequired (50% for refundable)
                       ├─ Status: PENDING
                       ├─ Payment Status: PENDING
                       ├─ advance_received: 0
                       ├─ Create Status History Entry
                       └─ Event: bookings.created
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          PAYMENT PHASE                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    7. Payment Record Created
                       POST /api/payments
                       ├─ Validate: Booking exists & not CANCELLED
                       ├─ Payment Mode: CASH/BANK_TRANSFER/PAYMENT_GATEWAY
                       ├─ Status: PENDING
                       ├─ is_verified: false (initially)
                       ├─ Upload proof_url (optional)
                       └─ Event: payments.created
                                  │
                    8. Payment Verification
                       POST /api/payments/:id/verify
                       ├─ Set is_verified: true
                       ├─ Set verified_by: user.id
                       ├─ Set verified_at: timestamp
                       ├─ Status: PENDING → FULL
                       └─ Event: payments.verified
                                  │
                    9. Sync Booking Payment Summary
                       (Auto-triggered after payment create/update/verify)
                       ├─ Calculate: paidAmount (sum of verified payments)
                       ├─ Calculate: refundedAmount (sum of processed refunds)
                       ├─ Calculate: netReceived = paidAmount - refundedAmount
                       ├─ Update Booking:
                       │   ├─ advance_received = netReceived
                       │   └─ payment_status:
                       │       ├─ PENDING (netReceived = 0)
                       │       ├─ PARTIAL (0 < netReceived < totalAmount)
                       │       ├─ FULL (netReceived >= totalAmount)
                       │       └─ REFUNDED (refundedAmount > 0 && netReceived = 0)
                       └─ Event: bookings.updated
                                  │
                   10. Booking Status Transition to CONFIRMED
                       POST /api/bookings/:id/status
                       ├─ Validate Payment Policy:
                       │   ├─ advance_received >= advanceRequired
                       │   └─ has verified payment proof
                       ├─ Status: PENDING → CONFIRMED
                       ├─ Create Status History Entry
                       ├─ Event: bookings.status_changed
                       └─ Event: bookings.updated
                                  │
                   11. Invoice Generation (Optional)
                       POST /api/bookings/:id/invoices/generate
                       ├─ Generate unique invoice_number
                       ├─ Create invoice record
                       ├─ Create pending payment for outstanding amount
                       └─ Event: bookings.invoice_generated
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      COMPLETION/REFUND PHASE                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                   12. Additional Payments (Balance Payment)
                       POST /api/payments
                       ├─ Same flow as step 7-9
                       └─ Payment Status: PARTIAL → FULL
                                  │
                   13. Booking Cancellation (if needed)
                       POST /api/bookings/:id/status
                       ├─ Status: CONFIRMED → CANCELLED
                       ├─ Require: cancellationReason
                       ├─ Set: cancelled_at timestamp
                       └─ Block: Further payments
                                  │
                   14. Refund Processing (if cancelled)
                       POST /api/refunds
                       ├─ Create refund record
                       ├─ Re-sync booking payment summary
                       └─ Payment Status: FULL → REFUNDED (if full refund)
```

---

## 🔑 Key Business Rules

### Quotation Rules
- Only **APPROVED** quotations can create bookings
- **DRAFT** quotations can be edited
- Margin approval required if `marginPercent < minMarginPercent`
- Lead status updates: `NEW → QUOTED → CONVERTED/LOST`

### Booking Rules
- **Advance Policy**:
  - 50% for refundable bookings
  - 100% for non-refundable bookings
- **Confirmation Requirements**:
  - `advance_received >= advanceRequired`
  - At least one verified payment with proof
- **CANCELLED** bookings cannot transition to other statuses
- Payments blocked for CANCELLED bookings

### Payment Rules
- **Payment Modes**: `CASH`, `BANK_TRANSFER`, `PAYMENT_GATEWAY`
- **Verification Required**: Payments must be verified to count toward booking
- **Status Calculation**:
  - `PENDING`: No verified payments
  - `PARTIAL`: Some payment received (< total)
  - `FULL`: Full payment received (>= total)
  - `REFUNDED`: All payments refunded

---

## 📡 API Endpoints Flow

### 1. Quotation APIs
```http
POST   /api/quotations              # Create quotation
PATCH  /api/quotations/:id          # Update (DRAFT only)
POST   /api/quotations/:id/send     # Send to customer
POST   /api/quotations/:id/status   # Approve/Reject
POST   /api/quotations/:id/track-view # Track customer view
GET    /api/quotations/:id          # Get quotation details
GET    /api/quotations              # List quotations
```

### 2. Booking APIs
```http
POST   /api/bookings                # Create from approved quotation
PATCH  /api/bookings/:id            # Update booking details
POST   /api/bookings/:id/status     # Transition status (PENDING→CONFIRMED→CANCELLED)
GET    /api/bookings/:id            # Get booking details
GET    /api/bookings/:id/status-history # View status changes
POST   /api/bookings/:id/invoices/generate # Generate invoice
GET    /api/bookings/:id/invoices   # List invoices
GET    /api/bookings                # List bookings
```

### 3. Payment APIs
```http
POST   /api/payments                # Create payment record
PATCH  /api/payments/:id            # Update payment
POST   /api/payments/:id/verify     # Verify payment (triggers sync)
GET    /api/payments/:id            # Get payment details
GET    /api/payments?bookingId=:id  # List payments for booking
GET    /api/payments                # List all payments
```

---

## 🔄 Auto-Sync Mechanism

**Payment → Booking Sync** (Automatic):
```javascript
// Triggered after: create, update, verify payment
syncBookingPaymentSummary(bookingId)
  ├─ Query: SUM(verified payments)
  ├─ Query: SUM(processed refunds)
  ├─ Calculate: netReceived = paid - refunded
  ├─ Determine: payment_status
  └─ Update: booking.advance_received & booking.payment_status
```

**Implementation Location:**
- File: `backend/src/modules/payments/payments.service.js`
- Function: `syncBookingPaymentSummary(bookingId)`
- Called by: `create()`, `update()`, `verify()`

---

## 📊 Database Tables Involved

### quotations
```sql
id, quote_number, status, final_price
lead_id → leads
template_id → quotation_templates
Events: created, sent, viewed, approved
```

### bookings
```sql
id, booking_number, quotation_id
status (PENDING/CONFIRMED/CANCELLED)
payment_status (PENDING/PARTIAL/FULL/REFUNDED)
total_amount, advance_required, advance_received
cost_amount, travel_start_date, travel_end_date
Events: created, updated, status_changed
```

### payments
```sql
id, booking_id, amount, currency
payment_mode, status, is_verified
proof_url, verified_by, verified_at
gateway_provider, gateway_order_id, gateway_payment_id
Events: created, updated, verified
```

### refunds
```sql
id, booking_id, payment_id
amount, status, processed_at
refund_mode, refund_reference
Events: created, processed
```

### booking_status_history
```sql
booking_id, old_status, new_status
changed_by, changed_at
```

---

## ⚡ Event System

### Quotations Events
```javascript
quotations.created          // New quotation created
quotations.sent             // Quotation sent to customer
quotations.viewed           // Customer viewed quotation
quotations.status_changed   // Status changed (APPROVED/REJECTED)
quotations.margin_approved  // Margin approval granted
quotations.pdf_generated    // PDF generated
```

### Bookings Events
```javascript
bookings.created            // New booking created
bookings.updated            // Booking details updated
bookings.status_changed     // Status transition
bookings.invoice_generated  // Invoice generated
bookings.deadline_alert     // Payment deadline alert
bookings.pre_travel_reminder // Pre-travel reminder
bookings.post_travel_feedback // Post-travel feedback
```

### Payments Events
```javascript
payments.created            // Payment record created
payments.updated            // Payment details updated
payments.verified           // Payment verified by admin
```

---

## 🎯 Critical Flow Points

### 1. Quotation Approval Gate
- **Rule**: Only APPROVED quotations can create bookings
- **Validation**: `quotation.status === 'APPROVED'`
- **Location**: `bookings.service.js → ensureQuotationExists()`

### 2. Payment Verification Gate
- **Rule**: Only verified payments count toward booking
- **Validation**: `payment.is_verified === true`
- **Location**: `payments.repository.js → getVerifiedPaidAmount()`

### 3. Confirmation Gate
- **Rule**: Advance requirement + proof → CONFIRMED
- **Validation**:
  - `advance_received >= advanceRequired`
  - `hasProof === true`
- **Location**: `bookings.service.js → assertPaymentPolicyForConfirmation()`

### 4. Cancellation Lock
- **Rule**: CANCELLED bookings cannot be modified
- **Validation**: `booking.status !== 'CANCELLED'`
- **Location**: `bookings.service.js → transitionStatus()`

### 5. Auto-Sync
- **Rule**: Payment changes automatically update booking status
- **Trigger**: After payment create/update/verify
- **Location**: `payments.service.js → syncBookingPaymentSummary()`

---

## 🔐 Authorization & Permissions

### Required Permissions
```javascript
// Quotations
quotations:create
quotations:read
quotations:update
quotations:send

// Bookings
bookings:create
bookings:read
bookings:update

// Payments
payments:create
payments:read
payments:update
payments:verify  // Admin only
```

---

## 💡 Example Flow Scenario

### Scenario: Customer Books a ₹50,000 Trip

```javascript
// Step 1: Create Quotation
POST /api/quotations
{
  "leadId": "lead-123",
  "components": [
    { "itemType": "HOTEL", "description": "5N Hotel", "cost": 30000 },
    { "itemType": "FLIGHT", "description": "Round Trip", "cost": 15000 }
  ],
  "marginPercent": 10,
  "taxPercent": 5
}
// Response: quotation.finalPrice = ₹50,000

// Step 2: Send Quotation
POST /api/quotations/qt-123/send
{ "channel": "EMAIL", "recipientEmail": "customer@example.com" }

// Step 3: Customer Approves
POST /api/quotations/qt-123/status
{ "status": "APPROVED" }

// Step 4: Create Booking
POST /api/bookings
{
  "quotationId": "qt-123",
  "travelStartDate": "2024-06-01",
  "travelEndDate": "2024-06-06",
  "totalAmount": 50000,
  "costAmount": 45000
}
// Response: booking.advanceRequired = ₹25,000 (50%)

// Step 5: Customer Pays Advance
POST /api/payments
{
  "bookingId": "bk-123",
  "amount": 25000,
  "paymentMode": "BANK_TRANSFER",
  "paymentReference": "TXN123456"
}
// Response: payment.isVerified = false

// Step 6: Admin Verifies Payment
POST /api/payments/pay-123/verify
{ "proofUrl": "https://s3.../proof.jpg" }
// Auto-triggers: syncBookingPaymentSummary()
// Result: booking.paymentStatus = "PARTIAL"

// Step 7: Confirm Booking
POST /api/bookings/bk-123/status
{ "status": "CONFIRMED" }
// Validation passes: advance_received (25000) >= advanceRequired (25000)

// Step 8: Customer Pays Balance
POST /api/payments
{
  "bookingId": "bk-123",
  "amount": 25000,
  "paymentMode": "BANK_TRANSFER"
}

// Step 9: Admin Verifies Balance Payment
POST /api/payments/pay-456/verify
// Auto-triggers: syncBookingPaymentSummary()
// Result: booking.paymentStatus = "FULL"
```

---

## 🚨 Error Handling

### Common Error Codes

```javascript
// Quotation Errors
QUOTATION_NOT_FOUND
QUOTATION_LOCKED                    // Cannot edit non-DRAFT
QUOTATION_MARGIN_APPROVAL_REQUIRED
QUOTATION_NOT_APPROVED              // Cannot create booking

// Booking Errors
BOOKING_NOT_FOUND
BOOKING_QUOTATION_NOT_FOUND
BOOKING_QUOTATION_NOT_APPROVED
BOOKING_ALREADY_EXISTS_FOR_QUOTATION
BOOKING_ADVANCE_NOT_MET             // Cannot confirm
BOOKING_PAYMENT_PROOF_REQUIRED
BOOKING_STATUS_LOCKED               // Cannot modify CANCELLED

// Payment Errors
PAYMENT_NOT_FOUND
PAYMENT_BOOKING_NOT_FOUND
PAYMENT_BOOKING_CANCELLED           // Cannot pay cancelled booking
PAYMENT_INVALID_MODE
```

---

## 📈 Status Transitions

### Quotation Status Flow
```
DRAFT → SENT → VIEWED → APPROVED
                    ↓
                REJECTED
```

### Booking Status Flow
```
PENDING → CONFIRMED → CANCELLED
    ↓
(Cannot transition from CANCELLED)
```

### Payment Status Flow
```
PENDING → PARTIAL → FULL
              ↓
          REFUNDED
```

---

## 🔍 Monitoring & Tracking

### Status History
- Every booking status change is logged in `booking_status_history`
- Includes: old_status, new_status, changed_by, changed_at

### Payment Tracking
- All payments linked to booking via `booking_id`
- Verification audit trail: verified_by, verified_at
- Proof storage: proof_url (S3 or local)

### Quotation Tracking
- View tracking: `quotation_views` table
- Send logs: `quotation_send_logs` table
- Version logs: `quotation_version_logs` table

---

## 📝 Notes

1. **Payment Verification is Critical**: Unverified payments do NOT count toward booking confirmation
2. **Advance Policy**: Configurable via `PAYMENT_POLICY.refundableAdvanceRatio` (default: 0.5)
3. **Currency Support**: Multi-currency support with exchange rates
4. **Deadline Management**: Automated deadline alerts and risk level tracking
5. **Event-Driven**: All major actions emit events for notifications/webhooks

---

## 🛠️ Implementation Files

### Core Service Files
- `backend/src/modules/quotations/quotations.service.js`
- `backend/src/modules/bookings/bookings.service.js`
- `backend/src/modules/payments/payments.service.js`

### Controller Files
- `backend/src/modules/quotations/quotations.controller.js`
- `backend/src/modules/bookings/bookings.controller.js`
- `backend/src/modules/payments/payments.controller.js`

### Route Files
- `backend/src/modules/quotations/quotations.routes.js`
- `backend/src/modules/bookings/bookings.routes.js`
- `backend/src/modules/payments/payments.routes.js`

### Event Files
- `backend/src/modules/quotations/quotations.events.js`
- `backend/src/modules/bookings/bookings.events.js`
- `backend/src/modules/payments/payments.events.js`

---

**Last Updated**: 2024
**Version**: 1.0
**Maintained By**: Travel CRM Development Team
