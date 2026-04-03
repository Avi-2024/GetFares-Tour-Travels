# Finance System - Complete Flow Documentation

## Overview
The Finance System (`/finance-system`) is a comprehensive financial management module that handles client onboarding, supplier management, cost analysis, and payment tracking for the Travel CRM.

---

## 1. Client Onboarding Tab

### Purpose
Maintain KYC-compliant client records with financial details required for invoicing and compliance.

### Features
- **Add/Edit/Delete Clients**
- **Search & Filter** by name, PAN, email, phone, address, currency
- **Export to CSV**
- **Pagination** (5 records per page)

### Data Fields
| Field | Required | Description |
|-------|----------|-------------|
| Full Name | No | Client's full name |
| PAN | No | Permanent Account Number (optional, 10 chars) |
| Email | Yes | Contact email |
| Phone | Yes | Contact number |
| Address | Yes | Complete address |
| Currency | No | Default: USD (USD, EUR, GBP, INR, AED, CAD, AUD) |

### API Endpoints
- `GET /api/customers?page=1&limit=300` - List all clients
- `POST /api/customers` - Create new client
- `PATCH /api/customers/:id` - Update client
- `DELETE /api/customers/:id` - Soft delete client

### Backend Mapping
```javascript
Frontend → Backend
name → fullName
pan → panNumber (optional, only sent if not empty)
email → email
phone → phone
address → addressLine
currency → clientCurrency
```

---

## 2. Supplier Onboarding Tab

### Purpose
Complete supplier registration with payment processing details including bank information for vendor payments.

### Features
- **Add/Edit Suppliers**
- **Deactivate Suppliers** (soft delete via isActive flag)
- **Search & Filter** by name, PAN, GST, contact, invoice details, status
- **Export to CSV**
- **Active/Inactive Status Tracking**

### Data Fields
| Field | Required | Description |
|-------|----------|-------------|
| Supplier Name | Yes | Business name |
| PAN | No | Permanent Account Number (optional) |
| GST | No | GST registration number |
| Email | Yes | Contact email |
| Phone | Yes | Contact number |
| Address | Yes | Complete address |
| Currency | No | Default: USD |
| **Invoice/Bank Details** | | |
| Beneficiary Name | No | Account holder name |
| Bank Name | No | Bank institution name |
| Account Number | No | Bank account number |
| IFSC/SWIFT | No | Bank routing code |
| UPI ID | No | UPI payment ID |

### API Endpoints
- `GET /api/suppliers?page=1&limit=300` - List all suppliers
- `POST /api/suppliers` - Create new supplier
- `PATCH /api/suppliers/:id` - Update supplier
- `PATCH /api/suppliers/:id` with `{isActive: false}` - Deactivate supplier

### Backend Mapping
```javascript
Frontend → Backend
name → name
pan → panNumber (optional, only sent if not empty)
gst → gstNumber
email → email
phone → phone
address → addressLine
currency → supplierCurrency
invoiceBeneficiaryName → invoiceBeneficiaryName
invoiceBankName → invoiceBankName
invoiceAccountNumber → invoiceAccountNumber
invoiceIfscSwift → invoiceIfscSwift
invoiceUpiId → invoiceUpiId
```

### Invoice Details Display
Concatenated string: `Beneficiary | Bank | Account | IFSC | UPI`

---

## 3. Cost Break-up Tab (Read-Only Analytics)

### Purpose
Financial analysis dashboard showing auto-calculated quotation cost breakdowns from the backend. This is a **read-only view** - all calculations happen in the Quotations module.

### Features
- **Date Range Filters** (from/to)
- **Currency Filter** (single currency or all)
- **Pagination** (10/20/50 rows per page)
- **Multi-Currency Support** with warning for mixed currencies
- **Export to CSV**

### Summary Cards (8 metrics)
1. **Total Quotations** - Count of quotes in filter
2. **Supplier Cost** - Base cost from supplier
3. **Supplier Tax** - Tax on supplier cost
4. **Markup** - Profit margin amount
5. **Service Fee** - Additional service charges
6. **GST** - Goods & Services Tax
7. **TCS** - Tax Collected at Source
8. **Total Sale Value** - Final customer price

### Currency Breakdown Table
Groups all metrics by currency with:
- Quote count per currency
- All 7 cost components per currency
- Total sale value per currency

### Quotation Cost Rows Table
Row-level detail for each quotation:
- Quote Number
- Lead Name
- Status (DRAFT, SENT, ACCEPTED, etc.)
- All 7 cost components
- Currency
- Created timestamp

### API Endpoint
```
GET /api/reports/finance/cost-breakup?from=2024-01-01&to=2024-12-31&currency=USD&page=1&limit=10
```

### Response Structure
```json
{
  "summary": {
    "supplierCost": 50000,
    "supplierTaxAmount": 5000,
    "markupAmount": 10000,
    "serviceFeeAmount": 2000,
    "gstAmount": 3000,
    "tcsAmount": 500,
    "totalSaleValue": 70500,
    "totalQuotes": 25
  },
  "currencyBreakdown": [
    {
      "currency": "USD",
      "totalQuotes": 15,
      "supplierCost": 30000,
      "supplierTaxAmount": 3000,
      "markupAmount": 6000,
      "serviceFeeAmount": 1200,
      "gstAmount": 1800,
      "tcsAmount": 300,
      "totalSaleValue": 42300
    },
    {
      "currency": "INR",
      "totalQuotes": 10,
      "supplierCost": 20000,
      "supplierTaxAmount": 2000,
      "markupAmount": 4000,
      "serviceFeeAmount": 800,
      "gstAmount": 1200,
      "tcsAmount": 200,
      "totalSaleValue": 28200
    }
  ],
  "rows": [
    {
      "id": "uuid",
      "quoteNumber": "Q-2024-001",
      "leadName": "John Doe",
      "status": "ACCEPTED",
      "supplierCost": 5000,
      "supplierTaxAmount": 500,
      "markupAmount": 1000,
      "serviceFeeAmount": 200,
      "gstAmount": 300,
      "tcsAmount": 50,
      "totalSaleValue": 7050,
      "effectiveCurrency": "USD",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 25,
    "totalPages": 3
  }
}
```

### Markup Calculation (Backend Logic)
**Markup is a percentage that calculates profit:**

```javascript
// In Quotations module (backend)
const supplierCost = 10000
const markupPercentage = 20 // 20%

// Profit (Markup Amount) = Supplier Cost × (Markup % / 100)
const markupAmount = supplierCost * (markupPercentage / 100)
// markupAmount = 10000 × 0.20 = 2000

// This markup amount is the PROFIT
```

**Example Breakdown:**
- Supplier Cost: ₹10,000
- Markup %: 20%
- **Profit (Markup Amount): ₹2,000**
- Service Fee: ₹500
- GST (18%): ₹2,250
- TCS (5%): ₹625
- **Total Sale Value: ₹15,375**

---

## 4. Payments Tab

### Purpose
Record and track customer payments against bookings with verification workflow.

### Features
- **Record New Payments**
- **Verify Pending Payments**
- **Search & Filter** by booking, payment ID, reference, mode, status
- **Export to CSV**
- **Payment Status Tracking** (pending/completed/failed)

### Data Fields
| Field | Required | Description |
|-------|----------|-------------|
| Booking ID | Yes | UUID of booking |
| Payment Mode | Yes | CASH, BANK_TRANSFER, PAYMENT_GATEWAY |
| Amount | Yes | Payment amount (positive number) |
| Date | Yes | Payment date |
| Reference | No | Transaction ID / Reference number |
| Currency | No | Default: USD |

### Payment Modes
- **CASH** - Cash payment
- **BANK_TRANSFER** - Direct bank transfer
- **PAYMENT_GATEWAY** - Online payment (UPI, Card, etc.)

### Payment Status
- **pending** - Awaiting verification
- **completed** - Verified and processed
- **failed** - Refunded or failed transaction

### API Endpoints
- `GET /api/payments?page=1&limit=300` - List all payments
- `POST /api/payments` - Record new payment
- `POST /api/payments/:id/verify` - Verify payment (changes status to completed)

### Backend Mapping
```javascript
Frontend → Backend
bookingId → bookingId
mode → paymentMode
amount → amount
date → paidAt (ISO date string)
reference → paymentReference
currency → currency
```

### Booking Lookup
Payments display booking information by fetching:
```
GET /api/bookings?page=1&limit=300
```
Maps booking ID to: `bookingNumber - customerName`

---

## UI/UX Features

### Responsive Design
- **Desktop**: Full tables with all columns
- **Mobile**: Card-based layout with essential info
- **Tablet**: Optimized middle ground

### Search & Filter
- Real-time search across all relevant fields
- Resets pagination to page 1 on search
- Case-insensitive matching

### Pagination
- 5 items per page (clients, suppliers, payments)
- 10/20/50 items per page (cost breakup)
- Previous/Next navigation
- Current page indicator
- Total count display

### Export to CSV
- Exports current filtered/paginated view
- Filename format: `finance-{tab}-{date}.csv`
- Proper CSV escaping for special characters

### Loading States
- "Loading latest data..." during fetch
- "Saving changes..." during mutations
- Disabled buttons during operations

### Error Handling
- Red banner for errors
- Green banner for success messages
- Auto-clear on tab switch or refresh

### Dark Mode Support
- Full dark theme compatibility
- Proper contrast ratios
- Smooth transitions

---

## Data Flow

### Client/Supplier Creation Flow
```
User fills form → Frontend validation → API call → Backend validation
→ Database insert → Event emission → Response → UI update → Success message
```

### Payment Recording Flow
```
User enters payment → Validate booking exists → Create payment record
→ Update booking payment status → Sync advance received → Success
```

### Cost Breakup Flow
```
User applies filters → API call with params → Backend aggregates quotations
→ Calculate all cost components → Group by currency → Paginate rows
→ Return summary + breakdown + rows → Display in UI
```

---

## Backend Integration Points

### Customers Module
- `customers.service.js` - Business logic
- `customers.validation.js` - Zod schemas
- `customers.repository.js` - Database queries

### Suppliers Module
- `suppliers.service.js` - Business logic with payables
- `suppliers.validation.js` - Zod schemas
- `suppliers.repository.js` - Database queries

### Payments Module
- `payments.service.js` - Payment processing & verification
- `payments.validation.js` - Zod schemas
- `payments.repository.js` - Database queries
- Auto-syncs booking payment status

### Reports Module
- `reports.service.js` - Analytics & aggregations
- `reports.repository.js` - Complex SQL queries
- `financeCostBreakup()` - Main cost analysis endpoint

---

## Security & Validation

### Frontend Validation
- Required fields enforced
- Email format validation
- Phone number format
- PAN format (10 chars uppercase)
- Positive numbers for amounts
- Date format validation

### Backend Validation (Zod)
- Strict type checking
- Min/max length constraints
- Email validation
- UUID validation for IDs
- Optional field handling
- Empty string → undefined conversion

### Authorization
- All endpoints require authentication
- RBAC middleware checks permissions
- User context passed to services

---

## Performance Optimizations

### Frontend
- `useMemo` for expensive computations
- `useCallback` for stable function references
- Debounced search (implicit via React state)
- Lazy loading of booking lookups
- Efficient pagination slicing

### Backend
- Database indexes on frequently queried fields
- Pagination at database level
- Aggregation pipelines for cost breakup
- Soft deletes (is_deleted flag)
- Connection pooling

---

## Future Enhancements

### Planned Features
1. **Supplier Payables Management** (already in backend, needs UI)
   - Track amounts owed to suppliers
   - Payment deadline alerts
   - Partial payment tracking

2. **Advanced Filters**
   - Date range for clients/suppliers
   - Payment status filters
   - Currency-specific views

3. **Bulk Operations**
   - Bulk import via CSV
   - Bulk status updates
   - Bulk export with custom fields

4. **Analytics Dashboard**
   - Payment trends over time
   - Top suppliers by volume
   - Currency distribution charts
   - Profit margin analysis

5. **Audit Trail**
   - Track all changes to financial records
   - User attribution
   - Timestamp tracking

---

## Troubleshooting

### Common Issues

**Issue**: PAN validation fails with empty string
**Solution**: Frontend now only sends PAN if not empty (conditional spread)

**Issue**: Mixed currency totals are confusing
**Solution**: Warning banner shown, recommend single currency filter

**Issue**: Booking not found in payment modal
**Solution**: Use exact UUID from bookings list, not booking number

**Issue**: Cost breakup shows zero values
**Solution**: Ensure quotations have finance fields populated in Quotations module

**Issue**: Supplier deactivate button not working
**Solution**: Check if supplier is already inactive (button disabled)

---

## Testing Checklist

### Client Onboarding
- [ ] Create client with all fields
- [ ] Create client without PAN
- [ ] Edit existing client
- [ ] Delete client (soft delete)
- [ ] Search by name, email, phone, PAN
- [ ] Export to CSV
- [ ] Pagination works correctly

### Supplier Onboarding
- [ ] Create supplier with invoice details
- [ ] Create supplier without optional fields
- [ ] Edit existing supplier
- [ ] Deactivate supplier
- [ ] Search by name, GST, invoice details
- [ ] Export to CSV
- [ ] Active/Inactive filter

### Cost Break-up
- [ ] View summary cards
- [ ] Apply date range filter
- [ ] Apply currency filter
- [ ] View currency breakdown table
- [ ] View quotation rows table
- [ ] Pagination through rows
- [ ] Export to CSV
- [ ] Mixed currency warning appears

### Payments
- [ ] Record new payment
- [ ] Verify pending payment
- [ ] Search by booking/reference
- [ ] View payment status
- [ ] Export to CSV
- [ ] Booking lookup displays correctly

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers` | GET | List clients |
| `/api/customers` | POST | Create client |
| `/api/customers/:id` | PATCH | Update client |
| `/api/customers/:id` | DELETE | Delete client |
| `/api/suppliers` | GET | List suppliers |
| `/api/suppliers` | POST | Create supplier |
| `/api/suppliers/:id` | PATCH | Update supplier |
| `/api/payments` | GET | List payments |
| `/api/payments` | POST | Record payment |
| `/api/payments/:id/verify` | POST | Verify payment |
| `/api/reports/finance/cost-breakup` | GET | Cost analysis |
| `/api/bookings` | GET | Booking lookups |

---

## Conclusion

The Finance System provides a complete financial management solution with:
- ✅ Client & Supplier KYC management
- ✅ Real-time cost analytics from quotations
- ✅ Payment tracking & verification
- ✅ Multi-currency support
- ✅ Export capabilities
- ✅ Responsive design
- ✅ Full backend integration

All financial calculations (markup/profit) happen in the **Quotations module** and are displayed here as read-only analytics.
