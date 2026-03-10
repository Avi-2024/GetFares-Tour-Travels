# Postman and Smoke Testing Guide

## 1. Prerequisites
From project root (`travel-crm`):

```powershell
npm install
npm run db:migrate
npm run db:seed:rbac
npm start
```

Default base URL: `http://localhost:3000`

## 2. Automated Smoke Tests
Run these scripts for quick backend verification:

```powershell
npm run test:sprint1
npm run test:sprint2
npm run test:sprint3
```

Current observed status (2026-03-09):
- Sprint 1: pass
- Sprint 2: pass
- Sprint 3: pass

## 3. Postman Assets
Import available files:
- `postman/Travel-CRM-Sprint1.postman_collection.json`
- `postman/Travel-CRM-local.postman_environment.json`

Select environment: **Travel CRM Local**

Note: collection currently covers Sprint 1 baseline. Sprint 2/3 endpoints should be tested manually until collection is extended.

## 4. Manual Test Order (Recommended)
1. `GET /health`
2. `POST /api/auth/register`
3. `POST /api/auth/login`
4. `GET /api/auth/me`
5. `POST /api/leads`
6. `POST /api/leads/distribute`
7. `POST /api/leads/:id/followups`
8. `GET /api/leads/followups/overdue`
9. `POST /api/leads/sla/process-breaches`
10. `POST /api/webhooks/meta-leads`
11. `POST /api/webhooks/website-enquiry`
12. `POST /api/webhooks/whatsapp-enquiry`
13. `POST /api/quotations`
14. `POST /api/quotations/:id/send`
15. `POST /api/quotations/:id/viewed`
16. `POST /api/quotations/:id/status`
17. `GET /api/quotations/reports/lead-to-quote`
18. `GET /api/notifications`

## 5. Expected Status Codes
- `GET /health` -> `200`
- `POST /api/auth/register` -> `201`
- `POST /api/auth/login` -> `200`
- `GET /api/auth/me` -> `200`
- `POST /api/leads` -> `201`
- Duplicate lead create -> `409` (`LEAD_DUPLICATE`)
- Webhooks new capture -> `201`
- Webhooks duplicate capture -> `200`
- `POST /api/leads/distribute` -> `200`
- `POST /api/leads/:id/followups` -> `201`
- `POST /api/quotations` -> `201`
- `POST /api/quotations/:id/send` -> `200`
- `POST /api/quotations/:id/status` -> `200`
- `POST /api/quotations/templates` -> `201`

## 6. Common Failures and Fix
- `401 AUTH_TOKEN_REQUIRED`: login again, check `Authorization` bearer token.
- `403 RBAC_FORBIDDEN`: role lacks required permission.
- `409 LEAD_DUPLICATE`: expected when same contact is re-captured.
- `500`: verify database migration state and `.env` configuration.
- `409 QUOTATION_MARGIN_APPROVAL_REQUIRED`: send/approve attempted before required margin approval.

## 7. Quick cURL Example
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Lead",
    "phone": "919999999999",
    "email": "lead@example.com",
    "source": "Website",
    "travelDate": "2026-05-25",
    "budget": 180000
  }'
```
