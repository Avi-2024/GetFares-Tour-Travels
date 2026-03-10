# Disaster Recovery Runbook

## 1. Scope
Runbook for outage recovery of Travel CRM backend and PostgreSQL data.

## 2. Targets
| Metric | Target |
| --- | --- |
| RTO | 60 minutes |
| RPO | 15 minutes |

## 3. Required Inputs
1. Latest validated backup artifact (`.dump` or `.sql`).
2. Database credentials for restore target.
3. Infrastructure access for app redeploy.
4. Incident commander and communication channel.

## 4. Recovery Procedure
1. Announce incident and freeze new deployments.
2. Verify platform status and confirm outage type.
3. Provision clean recovery DB instance.
4. Restore latest backup:
   - `npm run db:restore -- --file=<backup-file> --yes`
5. Run migrations if required:
   - `npm run db:migrate`
6. Start application with production env.
7. Validate runtime probes:
   - `GET /health`
   - `GET /health/live`
   - `GET /health/ready`
8. Run critical smoke tests:
   - `npm run test:sprint1`
   - `npm run test:sprint7`
   - `npm run test:sprint8`
9. Confirm business-critical flows manually:
   - Lead create
   - Quotation create/send
   - Booking + payment verify
10. Declare recovery complete and share incident summary.

## 5. Recovery Validation Checklist
| Check | Status |
| --- | --- |
| DB restored without errors | ☐ |
| App readiness returns 200 | ☐ |
| Metrics endpoint reachable | ☐ |
| Auth login successful | ☐ |
| Lead capture and quotation path working | ☐ |
| Payment and refund path working | ☐ |

## 6. Post-Incident Actions
1. Record actual RTO and RPO achieved.
2. Document root cause and prevention actions.
3. Rotate any compromised credentials.
4. Schedule a drill improvement task in next sprint.
