# Hierarchical RBAC + Country Segmentation (Incremental)

This implementation is additive on top of the current production codebase (Node.js + Express + PostgreSQL) and does not remove active user flows.

## Scope Added

- Country master (`countries`)
- Multi-country user mapping (`user_countries`)
- Optional normalized lead country reference (`leads.country_id`)
- Lead assignment audit (`lead_assignment_history`)
- User hierarchy alias (`users.parent_id`) while preserving `users.manager_id`
- Single-active-super-admin guard at service layer
- Manager/Agent hierarchy enforcement in users service
- Country CRUD APIs for admin settings
- Settings UI tab for country management

## New/Updated API Surface

### Countries
- `GET /api/countries`
- `GET /api/countries/:id?includeUsage=true`
- `POST /api/countries`
- `PATCH /api/countries/:id`

Auth + RBAC:
- Read: `settings:read`
- Write: `settings:update`

### Users (enhanced payload compatibility)

Existing endpoints remain:
- `POST /api/users`
- `PATCH /api/users/:id`

New optional fields accepted:
- `parentId` / `parent_id` (alias of manager link)
- `countryIds` (array of country UUIDs)
- `primaryCountryId`

Response now includes:
- `parentId`
- `countries`
- `countryIds`
- `primaryCountryId`

## Hierarchy Rules Enforced

- Super Admin: no parent
- Manager: no parent
- Agent: parent required and must be a manager
- Manager actor can create/update only own agents
- Agent actor cannot create/update users
- Only one active super admin allowed

## Lead Access Rules Tightened

- `getById` now enforces role access:
  - Super Admin/Admin/Accounts: full
  - Manager: own/team/unassigned within manager country scope
  - Agent: own assigned leads only
- Assignment history is recorded on every assign/reassign.

## Migration

Run migration:

```bash
cd backend
npm run db:migrate
```

Primary migration:
- `backend/database/migrations/024_hierarchical_rbac_countries.sql`

