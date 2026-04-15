# Lead Assignment Logic

## Scope
- CRM lead creation flow.
- Auto assignment decision flow.
- Manual assignment validation flow.
- Queue and escalation behavior.

## Entry Point
- Service entry: `create(payload, context)`.
- File: `backend/crm/modules/leads/leads.service.js`.
- Function starts near line `1668`.

## Create-Time Mandatory Checks
- Requires `clientCreatedAt` value.
- Requires `clientTimezone` value.
- Requires `leadCountry` value.
- Requires `nationality` value.
- Normalizes incoming lead status.

## Duplicate Lead Behavior
- Duplicate candidate uses email/phone.
- CRM users allow duplicates.
- Public capture blocks duplicates.
- Open duplicate throws conflict.
- Closed duplicate can pass.

## Customer Linking Behavior
- Finds or creates customer.
- Links lead to customer.
- Uses customer-link column check.

## Lead Record Creation
- Builds create payload record.
- Inserts lead into database.
- Ensures `leadCode` generation.
- Emits lead-created event hook.

## Auto Assignment Trigger
- Runs when `autoAssign !== false`.
- Runs if lead unassigned.
- Skips closed statuses.
- Calls `assignLead(..., force:true)`.
- Mode set `AUTO_CREATE`.
- Reason set `AUTO_ASSIGN_ON_CREATE`.

## Assignment Candidate Selection
- Function: `selectAssigneeForLead`.
- Uses active assignable users.
- Excludes on-leave users.
- Supports optional manager scope.

### Agent Pool Priority
- Tier 1: country + type.
- Tier 2: type + no-country.
- Type `BOTH` matches all.
- Country normalized before compare.

### Destination Expertise Preference
- Reads lead destination id/name.
- Prefers matching expertise agents.
- Falls back to full pool.

### High-Value Lead Rule
- Applies non-round-robin modes.
- Detects VIP/high budget lead.
- Sorts by lowest open load.
- Tie-break higher incentive percent.
- Final tie by user id.

### Default Round Robin Rule
- Sorts pool by user id.
- State stored per country/type.
- Picks next after last assigned.
- Wraps to first candidate.

## Manual Assignment Rules
- Assignee must exist.
- Assignee role must be agent.
- Assignee country must match.
- Manager can assign own team.
- Non-super manager blocked assign.

## Assignment Persistence
- Updates `assigned_to` field.
- Updates `assigned_at` field.
- Sets `response_deadline` if empty.
- Adds assignment history record.
- Emits assigned/reassigned events.

## Escalation and Queueing
- No candidate triggers escalation.
- Escalates to manager roles.
- Queues lead for retry.
- Queue reason stored explicitly.

## Activity Logging
- Assignment activity uses payload stamp.
- Uses `resolveActivityStamp(...)`.
- Requires createdAt/timezone values.
- Without stamp, activity skipped.

## Repository Methods Used
- `findActiveAssignableUsers(roleName)`.
- `findAssignableUserById(userId)`.
- `findUserCountryNames(userId)`.
- `getOpenLeadLoadByUserIds(ids)`.
- `enqueueLead({ leadId, reason })`.
- `createAssignmentHistory(payload)`.

## Important Time Note
- `assigned_at` uses backend current time.
- `response_deadline` backend-generated +15m.
- Activity timestamp can be wall-clock.
- If strict wall-clock needed:
- update assignment timestamp strategy.

## Related Automation Jobs
- `distributePending(...)` re-dispatches queue.
- `reassignInactive(...)` reassigns stale leads.

## Quick Verification Checklist
- Create lead with country.
- Keep `autoAssign` default true.
- Confirm `assignedTo` populated.
- Confirm assignment history row.
- Confirm queue when no agent.
- Confirm manager restrictions apply.

## File References
- Service: `backend/crm/modules/leads/leads.service.js`.
- Repository: `backend/crm/modules/leads/leads.repository.js`.
