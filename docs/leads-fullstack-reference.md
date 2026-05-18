# Leads Fullstack Reference

## Goal
- Build production leads module.
- Cover create, list, update.
- Cover assignment and follow-ups.
- Keep API contract stable.

## Current Code Locations
- Frontend list page:
  - `crm-frontend/src/pages/leads/Leads.tsx`
- Frontend detail page:
  - `crm-frontend/src/pages/leads/LeadDetails.tsx`
- Frontend create page:
  - `crm-frontend/src/pages/leads/CreateLead.tsx`
- Frontend API service:
  - `crm-frontend/src/services/leadsService.ts`
  - `crm-frontend/src/datasource/leadsDatasource.ts`
- Backend routes:
  - `backend/crm/modules/leads/leads.routes.js`
- Backend controller:
  - `backend/crm/modules/leads/leads.controller.js`
- Backend service:
  - `backend/crm/modules/leads/leads.service.js`
- Backend repository:
  - `backend/crm/modules/leads/leads.repository.js`
- Backend validation:
  - `backend/crm/modules/leads/leads.validation.js`

## Lead Lifecycle
- Lead arrives from source.
- Lead normalized at service.
- Lead saved in repository.
- Lead auto-assignment may run.
- SLA deadline gets calculated.
- Team creates follow-ups.
- Status moves by workflow.
- Lead closes as converted/lost.

## Lead Sources Supported
- Manual CRM lead creation.
- Public lead capture page.
- Meta webhook lead ingest.
- Imports or API integrations.

## Core UI Flows

### 1) Create Lead Flow
- User opens create form.
- Frontend validates required fields.
- Frontend calls `createLead(...)`.
- Backend validates payload schema.
- Service normalizes status values.
- Repository inserts customer+lead.
- Service may assign owner.
- Service writes activity logs.
- Response returns lead object.

### 2) View Leads Flow
- User opens leads listing.
- Frontend builds query filters.
- Frontend calls `listLeadsPage`.
- Backend enforces visibility scope.
- Repository builds SQL where clause.
- Pagination and sorting applied.
- API returns `items + pagination`.
- UI renders table and KPIs.

### 3) Lead Detail Flow
- User opens lead details.
- Frontend fetches lead by id.
- Frontend fetches follow-up history.
- Frontend shows SLA timeline.
- Frontend shows assignment history.

### 4) Status Update Flow
- User picks new status.
- Frontend posts patch payload.
- Backend validates transition inputs.
- Service resolves workflow policy.
- Service updates status/substatus.
- Service logs workflow activity.
- Optional reminder gets scheduled.

### 5) Follow-up Create Flow
- User picks follow-up type.
- User sets local datetime.
- Frontend sends wall-clock values.
- Backend requires timezone field.
- Service stores follow-up row.
- Next follow-up date updated.
- Notification events can fire.

### 6) Assignment Flow
- User selects assignee.
- Frontend posts assign payload.
- Backend validates assignee UUID.
- Service resolves assignment strategy.
- Repository updates assigned fields.
- Assignment history row created.
- Assignment event emitted.

## Backend Route Surface
- `GET /api/leads`
- `GET /api/leads/stats`
- `GET /api/leads/:id`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `POST /api/leads/:id/assign`
- `POST /api/leads/:id/followups`
- `GET /api/leads/:id/followups`
- `POST /api/leads/reassign-inactive`
- `GET /api/leads/followups/overdue`
- `POST /api/leads/followups/process-overdue`
- `POST /api/leads/followups/process-non-responsive`
- `POST /api/leads/followups/process-cadence-automation`

## Data Contract Notes
- Lead has stable UUID id.
- Lead has user-friendly code.
- Status uses canonical enums.
- Sub-status captures workflow step.
- Follow-up stores local wall-clock.
- Timezone stored for accuracy.
- Assignment stores assigned_by user.
- Activities store immutable timeline.

## Suggested DB Tables
- `leads`
- `customers`
- `destinations`
- `lead_followups`
- `lead_activities`
- `lead_assignment_history`
- `lead_dynamic_fields`
- `followup_alert_logs`

## Required Validation Rules
- Name and contact required.
- Status value must normalize.
- Lost needs close reason.
- Follow-up needs local datetime.
- Follow-up needs timezone value.
- Assignee must be valid UUID.
- Date range must be valid.

## Visibility and RBAC
- Super admin sees all.
- Manager sees scoped team.
- Consultant sees assigned leads.
- Include unassigned by policy.
- Enforce scope in backend.

## SLA and Automation
- Set first-response deadline.
- Detect overdue first response.
- Reassign inactive lead pool.
- Schedule cadence follow-ups.
- Auto-mark non-responsive leads.
- Notify manager on breaches.

## Observability Requirements
- Add request id everywhere.
- Log create/update/assign actions.
- Log follow-up scheduling failures.
- Emit structured domain events.
- Avoid PII in logs.

## API Response Shape
- Use consistent wrapper format.
- Example shape:

```json
{
  "success": true,
  "message": "Lead fetched",
  "data": {},
  "meta": {}
}
```

## Frontend Architecture Notes
- Use service + datasource.
- Keep pages state-focused.
- Keep API mapping centralized.
- Normalize server payloads once.
- Use debounced search filtering.
- Keep export logic async.

## Reference Build Plan
- Step 1: define DTO schemas.
- Step 2: build repository queries.
- Step 3: build business service.
- Step 4: build thin controller.
- Step 5: add routes+auth.
- Step 6: add frontend service.
- Step 7: build list/details UI.
- Step 8: add follow-up UX.
- Step 9: add assignment UX.
- Step 10: add audits+tests.

## Test Cases Minimum
- Create lead success path.
- Duplicate lead handling path.
- List filters with pagination.
- Country chip alias behavior.
- Status transition validation.
- Follow-up timezone correctness.
- Assignment scope enforcement.
- SLA breach auto actions.

## Production Hardening
- Index filterable columns.
- Add query timeout guard.
- Add pagination upper limit.
- Use transactions on multi-write.
- Add idempotency for create.
- Add retry-safe background jobs.

## Handover Notes
- Keep contracts backward compatible.
- Document all enum values.
- Track migration dependencies early.
- Validate live collations early.
- Keep frontend/backend dates aligned.
