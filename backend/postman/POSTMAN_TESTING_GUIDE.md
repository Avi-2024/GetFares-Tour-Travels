# Travel CRM API - Postman Testing Guide

## Quick Start

### 1. Import Collections
- Open Postman
- Click **Import** and select `Travel-CRM-Complete.postman_collection.json`
- Import the environment: `Travel-CRM-Dev.postman_environment.json`

### 2. Set Environment
- Click the environment dropdown (top-right)
- Select **Travel-CRM-Dev**

### 3. Start Testing
- Ensure backend is running on `http://localhost:3000`
- Start with **Health Checks** folder to verify connection
- Then proceed with **Authentication** to get tokens

---

## Folder Organization

### Health Checks
Quick verification endpoints to ensure the server is running:
- `GET /health` - Basic health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

**Run First:** Verify server connectivity before testing APIs

---

### Authentication
Handle user login and token management:

#### Initial Login
1. **Login - Admin**
   - Credentials: `admin@travel-crm.com` / `admin@123`
   - Automatically captures `accessToken` and `userId`
   - Use for admin-level operations

2. **Login - Sales Consultant**
   - Credentials: `rajesh@travel-crm.com` / `user@123`
   - Best for testing sales workflows
   - Automatically captures `accessToken` and `userId`

3. **Get Current User (Me)**
   - Verify logged-in user details
   - Returns: User profile, roles, permissions

4. **Register User**
   - Create new test users
   - Modify email/phone for each test

**Token Management:**
- Login response automatically sets `accessToken` variable
- This token is used in all subsequent API calls via `Authorization: Bearer {{accessToken}}`
- Token expires after 24 hours (default)

---

### Leads Management
Complete lead lifecycle management:

#### List All Leads
- **Method:** GET
- **Query Parameters:**
  - `page=1` - Pagination page
  - `limit=10` - Results per page
  - `status=OPEN` - Filter by status (OPEN, WIP, CONVERTED, LOST)
- **Response:** Captures first lead ID as `{{leadId}}`

#### Create Lead
- **Method:** POST
- **Body Parameters:**
  - `fullName` - Customer name
  - `email` - Customer email
  - `phone` - Customer phone (+91 format)
  - `destinationId` - Destination reference
  - `travelDate` - Desired travel date
  - `budget` - Budget in INR
  - `source` - Lead source (Direct, Google, Facebook, etc.)
  - `status` - Initial status (default: OPEN)

#### Get Lead by ID
- **Method:** GET
- **Uses:** `{{leadId}}` variable from list response

#### Update Lead
- **Method:** PATCH
- **Update Fields:** status, budget, travelDate, notes

#### Assign Lead to Sales User
- **Method:** POST
- **Body:** `{"assignedTo": "{{userId}}"}`
- **Effect:** Lead assigned to specified user, status changes to WIP

#### Create Lead Followup
- **Method:** POST
- **Types:** `follow_up`, `call_reminder`, `email_sent`
- **Future Date:** Must be after current date
- **Note:** Stores interaction history with customer

---

### Quotations
Quote generation and tracking:

#### List Quotations
- **Method:** GET
- **Statuses:** PENDING, ACCEPTED, REJECTED, EXPIRED
- **Captures:** `{{quotationId}}` for subsequent requests

#### Create Quotation
- **Method:** POST
- **Prerequisites:** Must have a lead and destination
- **Key Fields:**
  - `leadId` - Reference to lead
  - `destinationId` - Destination package
  - `days` & `nights` - Trip duration
  - `pax` - Number of passengers
  - `baseCost` - Cost from supplier
  - `quotedPrice` - Price quoted to customer
  - `profitPercent` - Profit margin (%)

#### Get Quotation
- **Method:** GET
- **Includes:** Quotation details, items, pricing breakdown

#### Update Quotation
- **Method:** PATCH
- **Status Changes:**
  - PENDING → ACCEPTED (when customer agrees)
  - PENDING → REJECTED (when customer declines)
- **Price Updates:** Can revise price before acceptance

#### Get Quotation Templates
- **Method:** GET
- **Returns:** Pre-built itinerary templates for quick quoting

---

### Bookings
Confirmed bookings and fulfillment:

#### List Bookings
- **Method:** GET
- **Statuses:** PENDING, CONFIRMED, COMPLETED, CANCELLED
- **Captures:** `{{bookingId}}` for operations

#### Create Booking
- **Method:** POST
- **Prerequisites:** Quotation must be ACCEPTED
- **Fields:**
  - `leadId` - Reference lead
  - `destinationId` - Destination
  - `paxCount` - Total passengers
  - `totalAmount` - Final booking amount
  - `status` - Initial (PENDING or CONFIRMED)

#### Get Booking
- **Method:** GET
- **Includes:** All booking details, customer info, itinerary

#### Update Booking Status
- **Method:** POST
- **Transitions:**
  - PENDING → CONFIRMED (when payment received)
  - CONFIRMED → COMPLETED (after trip)
  - Any → CANCELLED (cancellation)
- **Auto-Generate:** Invoice generated on CONFIRMED status

#### Get Status History
- **Method:** GET
- **Shows:** Timeline of all status changes with timestamps

#### Generate Invoice
- **Method:** POST
- **Types:** DRAFT, FINAL
- **Output:** PDF invoice with itemized billing

---

### Payments
Payment tracking and reconciliation:

#### List Payments
- **Method:** GET
- **Statuses:** PENDING, COMPLETED, FAILED, REFUNDED
- **Filter:** By status, booking, date range

#### Create Payment
- **Method:** POST
- **Payment Methods:**
  - BANK_TRANSFER
  - CREDIT_CARD
  - DEBIT_CARD
  - CASH
  - CHEQUE
  - UPI
- **Fields:**
  - `bookingId` - Reference booking
  - `amount` - Payment amount in INR
  - `paymentMethod` - Method used
  - `transactionRef` - Reference number from bank/gateway
  - `status` - COMPLETED, PENDING, FAILED

#### Get Payment
- **Method:** GET
- **Includes:** Full payment details and reconciliation status

---

### Customers
Customer relationship management:

#### List Customers
- **Method:** GET
- **Shows:** All customers with booking history summaries

#### Get Customer
- **Method:** GET
- **Includes:**
  - Personal details
  - Contact information
  - Experience level (first-time, repeat)
  - Total trips booked
  - Total amount spent

#### Get Customer Bookings
- **Method:** GET
- **Shows:** All bookings for single customer
- **Useful For:** Customer history and repeat booking patterns

---

### Destinations & Pricing
Package and pricing management:

#### List Destinations
- **Method:** GET
- **Shows:** All available destinations
- **Captures:** `{{destinationId}}` for creating quotes/bookings

#### Get Destination
- **Method:** GET
- **Includes:**
  - Description and highlights
  - Best visit season
  - Visa requirements
  - Typical package options

#### Get Destination Pricing
- **Method:** GET
- **Shows:** Per-person costs by duration and season
- **Fields:**
  - Base cost from suppliers
  - Margin guidelines
  - Seasonal pricing variations

---

### Campaigns
Marketing campaign tracking:

#### List Campaigns
- **Method:** GET
- **Shows:** All active marketing campaigns

#### Create Campaign
- **Method:** POST
- **Fields:**
  - Campaign name
  - Source channel (Google Ads, Facebook, Direct, etc.)
  - Budget allocation
  - Start and end dates
- **Useful For:** Attribution tracking of lead sources

#### Get Campaign
- **Method:** GET
- **Metrics:**
  - Leads generated
  - Conversion rate
  - ROI calculation
  - Cost per acquisition

---

### Reports
Analytics and business intelligence:

#### Dashboard Summary
- **Method:** GET
- **Shows:**
  - Total leads this month
  - Conversion rate
  - Revenue summary
  - Active bookings

#### Revenue Report
- **Method:** GET
- **Parameters:**
  - `startDate` - Report period start
  - `endDate` - Report period end
- **Metrics:**
  - Total revenue
  - Profit earned
  - Payment status breakdown
  - Top destinations

#### Lead Conversion Report
- **Method:** GET
- **Metrics:**
  - Leads by status
  - Average conversion time
  - Lost reason analysis
  - Pipeline value

#### Sales Performance
- **Method:** GET
- **Parameters:** `userId={{userId}}` for individual user report
- **Metrics:**
  - Sales by user
  - Target vs actual
  - Avg deal size
  - Win rate

---

### RBAC & Permissions
Role-based access control:

#### Get My Permissions
- **Method:** GET
- **Shows:** All modules and actions current user can access

#### List All Roles
- **Method:** GET
- **System Roles:**
  - `super_admin` - Full system access
  - `admin` - Manage users and settings
  - `sales_manager` - Manage team and sales
  - `sales_consultant` - Create quotes and bookings
  - `customer_support` - Handle complaints
  - `finance` - Payment and refund management

#### Assign Role to User
- **Method:** POST
- **Effect:** Changes user's role and permissions immediately
- **Admin Only:** Requires admin privileges

---

## Testing Workflow

### Scenario 1: New Lead → Quotation → Booking

1. **Create Lead**
   - POST `/api/leads` with customer details
   - Save `leadId` from response

2. **Assign Lead**
   - POST `/api/leads/{{leadId}}/assign`
   - Assigns to current user

3. **Create Quotation**
   - POST `/api/quotations` with lead and destination
   - Save `quotationId`

4. **Accept Quotation**
   - PATCH `/api/quotations/{{quotationId}}`
   - Change status to ACCEPTED

5. **Create Booking**
   - POST `/api/bookings` from accepted quotation
   - Save `bookingId`

6. **Create Payment**
   - POST `/api/payments` against booking
   - Confirm booking status changes to CONFIRMED

7. **Generate Invoice**
   - POST `/api/bookings/{{bookingId}}/invoices/generate`
   - Generates PDF invoice

---

### Scenario 2: Follow-up Management

1. Login as Sales Consultant
2. List open leads: GET `/api/leads?status=OPEN`
3. Pick a lead and add followup: POST `/api/leads/{{leadId}}/followups`
4. Track followups: GET `/api/leads/{{leadId}}/followups`
5. Check overdue followups for SLA breaches

---

### Scenario 3: Payment & Refund

1. Create booking and confirm status
2. Record payment: POST `/api/payments`
3. Verify payment status: GET `/api/payments/{{paymentId}}`
4. If refund needed: POST `/api/refunds`
5. Track refund status

---

## Variable Auto-Population

These requests automatically capture and set variables:

| Request | Captures Into | Value |
|---------|---------------|-------|
| Login requests | `{{accessToken}}` | JWT token for auth |
| Login requests | `{{userId}}` | Current user's ID |
| List Leads | `{{leadId}}` | First lead's ID |
| List Quotations | `{{quotationId}}` | First quotation's ID |
| List Bookings | `{{bookingId}}` | First booking's ID |
| List Customers | `{{customerId}}` | First customer's ID |
| List Destinations | `{{destinationId}}` | First destination's ID |
| List Payments | `{{paymentId}}` | First payment's ID |
| List Campaigns | `{{campaignId}}` | First campaign's ID |

**Usage:** These variables are then used in subsequent GET/PATCH/POST requests (e.g., `GET /api/leads/{{leadId}}`)

---

## Common Issues & Solutions

### 401 Unauthorized
**Issue:** `"message": "Unauthorized"`
- **Solution:** Login first (POST `/api/auth/login`) to get accessToken
- Verify token is not expired (24-hour validity)

### 400 Bad Request
**Issue:** `"message": "Validation failed"`
- **Cause:** Missing or invalid required fields
- **Solution:** Check request body against API documentation
- Example: `destinationId` must be a valid UUID

### 404 Not Found
**Issue:** `"message": "Resource not found"`
- **Cause:** ID (leadId, bookingId, etc.) doesn't exist
- **Solution:** Create resource first or get correct ID from list endpoint

### 403 Forbidden
**Issue:** `"message": "Access denied"`
- **Cause:** User role lacks permission for operation
- **Solution:** Use admin account or request role change

### 500 Internal Server Error
**Issue:** Server error
- **Check:** Backend logs in terminal
- **Solution:** Restart backend, verify database connection

---

## Testing Best Practices

1. **Always Login First**
   - Get fresh token before each test session
   - Multiple tabs can share same token

2. **Use Variables**
   - Reference variables with `{{variableName}}`
   - Avoid hardcoding IDs

3. **Test in Order**
   - Health → Auth → Resource Creation
   - Create before reading/updating

4. **Verify Responses**
   - Check status code (200, 201, 400, etc.)
   - Validate response structure matches expectations

5. **Use Test Scripts**
   - Collection includes auto-capture scripts
   - Enables automated testing workflows

6. **Clear Data Between Tests**
   - Use timestamp in test data (email, names)
   - Prevents duplicate key errors
   - Example: `test-{{$timestamp}}@test.com`

---

## Performance Notes

- **Pagination:** Use `limit` parameter to control response size
- **Filtering:** Use query parameters to reduce data transfer
- **Bulk Operations:** Not yet available; implement items one-by-one

---

## Support

For API issues:
- Check backend logs: `npm run dev` terminal
- Verify database connection: `npm run db:test`
- Test endpoint health: POST `/health` endpoints

For Postman issues:
- Import fresh collection
- Reset environment variables: Clear all custom values
- Check base URL matches running backend
