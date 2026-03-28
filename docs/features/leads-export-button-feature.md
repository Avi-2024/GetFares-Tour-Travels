# Leads Export Button Feature

## Purpose
Export leads to CSV from the Leads Management page with full pagination support.

When filters are empty, export should include all leads available from the API (not only the current visible page).

## Location
- Frontend page: `frontend/src/pages/leads/Leads.tsx`
- Frontend service: `frontend/src/services/leadsService.ts`
- Backend list endpoint: `GET /api/leads`

## How It Works
1. User clicks the `Export Filtered` button on `/leads`.
2. UI sets `exporting = true` and disables the button.
3. Frontend builds query params using current state:
- search
- quick filter
- advanced filters (country, status, destination, date range, email, phone, leadId, sla, sortBy)
4. Frontend fetches first page with `limit=500` using `listLeadsPage(...)`.
5. Frontend reads `pagination.totalPages` from response.
6. Frontend fetches remaining pages (`2..totalPages`) and appends all rows.
7. Frontend generates CSV in browser and downloads file.
8. UI resets `exporting = false`.

## No-Filter Behavior
If no filters/search/quick filter are active:
- Export query is effectively "all leads".
- CSV contains all rows returned by paginated API across all pages.

## Filtered Behavior
If any filter/search/quick filter is active:
- Export includes all matching rows across all pages.
- Not limited to current table page.

## CSV Content
Columns:
- Lead
- Lead ID
- Contact
- Destination
- Visa/Holidays
- Status
- SLA

File naming:
- `leads-all-YYYY-MM-DD.csv` when no filters
- `leads-filtered-<count>-YYYY-MM-DD.csv` when filters are active

## API Contract Required
Export flow depends on list response containing pagination metadata:

```json
{
  "data": {
    "data": [],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

## Notes
- Export obeys backend visibility rules (RBAC and lead access constraints).
- Soft-deleted leads are excluded by backend list logic.
- On API failure, frontend shows an inline error and stops export.
