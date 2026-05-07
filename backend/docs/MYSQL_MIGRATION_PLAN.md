# MySQL Migration Plan

## Current Status

- Core DB adapter now supports both:
  - `postgres` (existing)
  - `mysql` (new)
- Runtime switch added via env:
  - `DATABASE_CLIENT=mysql` or `DATABASE_URL=mysql://...`
- Compatibility layer added for common PostgreSQL SQL syntax in MySQL mode:
  - `$1` placeholders -> `?`
  - `::type` casts removed
  - `ILIKE` -> `LIKE`
  - `INTERVAL '1 day'` -> `INTERVAL 1 DAY`
  - `table_schema='public'` -> `table_schema = DATABASE()`
  - `ON CONFLICT ... DO NOTHING` -> `INSERT IGNORE`
  - `ON CONFLICT ... DO UPDATE` -> `ON DUPLICATE KEY UPDATE`
  - basic `= ANY($n)` -> `IN (?)`
  - `RETURNING` emulation for simple `INSERT/UPDATE/DELETE`
- Migration runner now supports MySQL-specific migration files:
  - file pattern: `NNN_name.mysql.sql`
- CMS config now accepts MySQL host vars:
  - `DATABASE_CLIENT`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- Added generated MySQL bootstrap schema:
  - `backend/database/migrations/001_initial.mysql.sql`
- Added MySQL env template:
  - `backend/.env.mysql.example`

## Important

This codebase still contains many PostgreSQL-only SQL constructs in repositories.
Automatic compatibility can only handle a subset.

Audit report:

- `backend/docs/MYSQL_AUDIT_REPORT.md`

## Next Execution Steps

1. Create MySQL schema bootstrap migration:
   - `backend/database/migrations/001_initial.mysql.sql`
2. Convert high-risk modules first (blocking app boot paths):
   - `crm/core/automation/scheduler.js`
   - `crm/core/roles/roles.service.js`
   - `crm/modules/auth/*`
   - `crm/modules/leads/*`
3. Convert analytics modules with heavy PG functions:
   - `crm/modules/dashboard/*`
   - `crm/modules/suppliers/*`
4. Convert CMS repositories using `RETURNING`.
5. Run dual-run validation on staging:
   - Compare key API responses PG vs MySQL.
6. Cutover plan:
   - Freeze writes
   - Backfill MySQL
   - Smoke tests
   - Switch `DATABASE_CLIENT=mysql`
   - Monitor and rollback guard.

## Env Example (MySQL)

```env
DATABASE_CLIENT=mysql
DATABASE_URL=mysql://user:password@host:3306/travel_crm
```

or

```env
DATABASE_CLIENT=mysql
MYSQL_HOST=host
MYSQL_PORT=3306
MYSQL_USER=user
MYSQL_PASSWORD=password
MYSQL_DATABASE=travel_crm
```
