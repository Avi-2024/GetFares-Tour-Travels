# Customer Leads API Fix

## Issue
The `/api/customers/:id/leads` endpoint was returning null/empty data.

## Root Cause
The initial implementation was querying the `customer_leads` junction table, but the actual relationship between customers and leads is stored directly in the `leads` table via the `customer_id` column.

## Solution
Updated the `findLeadsByCustomerId` repository method to:

1. **Check for customer_id column**: First verify if the `leads` table has a `customer_id` column
2. **Direct query**: Query the `leads` table directly using `WHERE customer_id = ?`
3. **Fallback to junction table**: If `customer_id` column doesn't exist, use the `customer_leads` junction table
4. **In-memory fallback**: For non-SQL databases, filter leads in memory

## Updated Query
```sql
SELECT l.*
FROM leads l
WHERE l.customer_id = ?
  AND COALESCE(l.is_deleted, 0) = 0
ORDER BY l.created_at DESC
```

## Database Schema
The `leads` table has a `customer_id` column that directly references the `customers` table:
- `leads.customer_id` → `customers.id`

The `customer_leads` junction table exists but may not be actively used in the current implementation.

## Testing
After this fix:
1. Navigate to any customer detail page
2. The "Leads" section should display all leads associated with that customer
3. Each lead card shows:
   - Lead code
   - Destination and travel date
   - Status badge
4. Click on a lead card to navigate to lead details

## Files Modified
- `backend/crm/modules/customers/customers.repository.js`
  - Updated `findLeadsByCustomerId` method
  - Added column existence check
  - Improved error handling
  - Added logging

## Production Ready
✅ Error handling
✅ Fallback mechanisms
✅ Logging for debugging
✅ Soft delete support
✅ Performance optimized with direct query
