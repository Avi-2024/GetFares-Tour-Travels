# RBAC Hierarchy + Country Assignment (Issue Plan)

## Goal

Implement fully role-based hierarchy and lead assignment:
- `super_admin` manages roles, permissions, users, and hierarchy
- `manager` handles team-level operations
- `agent` works assigned leads
- country and team scope is enforced by backend

## Completed Backend Work

1. User hierarchy schema
- Added `users.manager_id` via migration:
  - `backend/database/migrations/023_users_manager_hierarchy.sql`
- Added index on `manager_id`
- Updated SQL baselines (`main-db.sql`, `migrations/database.sql`)

2. Users module hierarchy support
- Added `managerId` in create/update validation
- Added mapping and output fields in users service
- Added guards:
  - manager link allowed for agent roles only
  - manager must exist and be a manager role
  - self-manager blocked

3. RBAC hardening
- Added shared role normalization and `isSuperAdminRole` helper
- RBAC manage routes restricted to superadmin on backend

4. Leads assignment and visibility
- Assignment supports:
  - country matching
  - manager team scoping (`manager_id`)
  - manual assignee validation
- Manager visibility scoped to team and relevant unassigned leads
- Agent visibility scoped to own leads
- Superadmin has full visibility

## Completed Frontend Work

1. User management hierarchy UI
- Added manager selector in user create/edit modal
- Added agent type field
- Sends `managerId` and `agentType` to API

2. Lead assignment UI
- Added Assign Lead block in lead details page
- Uses backend assign API for actual policy enforcement

3. Country normalization
- Added shared country constants:
  - `frontend/src/utils/countries.ts`
- Reused in:
  - `CreateLead`
  - `UsersPage`
  - `Settings`

4. Removed frontend hardcoded RBAC gating
- Removed hardcoded `super_admin` checks from:
  - `frontend/src/pages/users/UsersPage.tsx`
  - `frontend/src/components/layout/Settings.tsx`
- UI now relies on permission-driven behavior; backend remains source of truth for enforcement.

## Known Behavior

- Role deletion endpoint is not available in current API surface.
- User "delete" is soft deactivate (`isActive=false`), not hard delete.
- If role dropdown is empty, ensure user has `rbac:manage` permission and re-login to refresh session/permissions.

## Suggested Next Steps

1. Add dedicated "assignment candidates" endpoint so frontend does not fetch all users.
2. Add role delete/deactivate flow (if business approves).
3. Add automated tests for:
   - manager team boundaries
   - country mismatch assignment rejection
   - superadmin-only RBAC management
