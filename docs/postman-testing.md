# Postman Testing Guide (Sprint 1)

## 1) Start backend
From project root `travel-crm`:

```powershell
node scripts/migrate.js
node scripts/seed-rbac.js
node src/server.js
```

Default base URL is `http://localhost:3000`.

## 2) Import in Postman
Import these files:

- `postman/Travel-CRM-Sprint1.postman_collection.json`
- `postman/Travel-CRM-local.postman_environment.json`

Select environment: **Travel CRM Local**.

## 3) Run sequence
Run collection folders in this order:

1. `00 - Smoke`
2. `01 - Auth`
3. `02 - Leads`
4. `03 - Webhooks`
5. `04 - RBAC`

`Register` request auto-generates unique email/lead data each run.

## 4) Expected status codes
- `GET /health` -> `200`
- `POST /api/auth/register` -> `201`
- `POST /api/auth/login` -> `200`
- `GET /api/auth/me` -> `200`
- `POST /api/leads` -> `201`
- `POST /api/leads` duplicate -> `409` (`LEAD_DUPLICATE`)
- Webhooks (`/api/webhooks/*`) -> `201` on first capture, `200` if duplicate
- `GET /api/rbac/me/permissions` -> `200`

## 5) Common issues
- `401 AUTH_TOKEN_REQUIRED`: run `Login` and check `token` variable.
- `403 RBAC_FORBIDDEN`: logged-in role missing permission.
- `500`: verify DB migrated and `.env` has valid `DATABASE_URL`.
- `404`: check `baseUrl` and server is running.
