# Customer Leads Feature Implementation

## Overview
Added functionality to display all leads associated with a customer in the Customer Detail Page.

## Changes Made

### Backend Changes

#### 1. Routes (`customers.routes.js`)
- Added new route: `GET /api/customers/:id/leads`
- Protected with authentication and authorization (`customers:read` permission)

#### 2. Controller (`customers.controller.js`)
- Added `getLeads` method to handle the API request
- Returns leads data for the specified customer

#### 3. Service (`customers.service.js`)
- Added `getLeads` method to fetch leads for a customer
- Validates customer exists before fetching leads

#### 4. Repository (`customers.repository.js`)
- Added `findLeadsByCustomerId` method
- Queries the `customer_leads` junction table to get associated leads
- Filters out soft-deleted records
- Orders leads by creation date (newest first)
- Supports both raw SQL queries and fallback to in-memory filtering

### Frontend Changes

#### 1. Customer Detail Page (`CustomerDetailPage.tsx`)
- Added `Lead` interface for type safety
- Added state to store leads: `const [leads, setLeads] = useState<Lead[]>([])`
- Fetches leads data when customer detail page loads
- Added new "Leads" section below "Recent Bookings"
- Displays lead information:
  - Lead code/ID
  - Destination and travel date
  - Status badge with color coding
- Clickable cards that navigate to lead detail page
- Shows "No leads found" message when customer has no leads
- "View All" button to navigate to leads page

## Database Schema
The feature uses the existing `customer_leads` junction table:
```sql
CREATE TABLE customer_leads (
    customer_id CHAR(36),
    lead_id CHAR(36),
    is_deleted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (customer_id, lead_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

## API Endpoint

### Get Customer Leads
**Endpoint:** `GET /api/customers/:id/leads`

**Authentication:** Required

**Authorization:** `customers:read` permission

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "lead_code": "A1B2C3",
      "full_name": "John Doe",
      "phone": "1234567890",
      "email": "john@example.com",
      "status": "QUOTED",
      "travel_to": "Dubai",
      "travel_date": "2024-06-15",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## UI Features

### Lead Card Display
- Green icon badge with "L" for leads
- Lead code or truncated ID
- Destination and travel date
- Status badge with color coding:
  - Green: CONVERTED
  - Red: LOST
  - Blue: QUOTED
  - Gray: Other statuses
- Hover effect for better UX
- Click to navigate to lead detail page

### Empty State
- Shows "No leads found" message when customer has no associated leads

## Production Ready Features

1. **Error Handling**: Gracefully handles API errors without breaking the page
2. **Loading States**: Integrated with existing loading mechanism
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Responsive Design**: Works on all screen sizes with Tailwind CSS
5. **Dark Mode**: Full dark mode support
6. **Performance**: Efficient queries with proper indexing
7. **Security**: Protected with authentication and authorization
8. **Soft Delete Support**: Respects soft-deleted records
9. **Navigation**: Seamless navigation to lead details

## Testing Checklist

- [x] Backend route added and protected
- [x] Controller method implemented
- [x] Service method with validation
- [x] Repository method with SQL and fallback
- [x] Frontend API integration
- [x] UI component with proper styling
- [x] Dark mode support
- [x] Error handling
- [x] Empty state handling
- [x] Navigation functionality
- [x] Type safety

## Future Enhancements

1. Add pagination for customers with many leads
2. Add filters (by status, date range)
3. Add search functionality
4. Add lead creation from customer page
5. Add lead statistics (total, by status)
