# UAT and Go-Live Checklist

## 1. Purpose
Use this checklist for final UAT signoff and production release readiness.

## 2. Environment Readiness
| Check | Owner | Status |
| --- | --- | --- |
| Production `.env` prepared with secure secrets | DevOps | ☐ |
| `DATABASE_URL` points to production DB | DevOps | ☐ |
| `JWT_ACCESS_SECRET` is rotated and strong | Security | ☐ |
| `CORS_ORIGIN` restricted to approved frontend domains | DevOps | ☐ |
| `METRICS_ENABLED` configured | DevOps | ☐ |
| `METRICS_TOKEN` configured (if metrics endpoint is private) | DevOps | ☐ |

## 3. Database and Data Safety
| Check | Owner | Status |
| --- | --- | --- |
| Latest migrations executed successfully | Backend | ☐ |
| RBAC seed executed and validated | Backend | ☐ |
| Backup script run and artifact stored | DevOps | ☐ |
| Restore drill completed on non-prod env | DevOps | ☐ |
| Rollback plan documented for failed deployment | DevOps | ☐ |

## 4. API and Runtime Health
| Check | Command / Validation | Status |
| --- | --- | --- |
| Basic health endpoint | `GET /health` | ☐ |
| Liveness endpoint | `GET /health/live` | ☐ |
| Readiness endpoint | `GET /health/ready` | ☐ |
| Metrics endpoint | `GET /metrics` and `/metrics/json` | ☐ |
| Graceful shutdown verified | SIGTERM drain + readiness `503` | ☐ |

## 5. Regression and Sprint Validation
| Check | Command | Status |
| --- | --- | --- |
| Lint | `npm run lint` | ☐ |
| Sprint 1 smoke | `npm run test:sprint1` | ☐ |
| Sprint 2 smoke | `npm run test:sprint2` | ☐ |
| Sprint 3 smoke | `npm run test:sprint3` | ☐ |
| Sprint 4 smoke | `npm run test:sprint4` | ☐ |
| Sprint 5 smoke | `npm run test:sprint5` | ☐ |
| Sprint 6 smoke | `npm run test:sprint6` | ☐ |
| Sprint 7 smoke | `npm run test:sprint7` | ☐ |
| Sprint 8 smoke | `npm run test:sprint8` | ☐ |

## 6. Business UAT Scenarios
| Scenario | Expected Result | Status |
| --- | --- | --- |
| Lead captured from webhook | Lead created or deduped correctly | ☐ |
| Lead assignment workflow | Lead assigned by rule/manual flow | ☐ |
| Follow-up reminders and overdue processing | Follow-up dashboard reflects state | ☐ |
| Quotation lifecycle | Draft -> Sent -> Approved/Rejected works | ☐ |
| Booking creation and confirmation guard | No confirmation without payment compliance | ☐ |
| Payment verification and booking sync | Booking payment snapshot updates | ☐ |
| Refund approval/reject/process | Status transitions and calculations valid | ☐ |
| Visa workflow with documents/checklist | Status validation and document checks pass | ☐ |
| Reports dashboards | KPI and analytics endpoints return expected values | ☐ |

## 7. Security and Access Validation
| Check | Status |
| --- | --- |
| Unauthorized routes blocked without JWT | ☐ |
| RBAC permission checks enforced | ☐ |
| Sensitive logs are redacted | ☐ |
| Metrics access protected if token configured | ☐ |

## 8. Go-Live Signoff
| Signoff | Name | Date | Status |
| --- | --- | --- | --- |
| Product Owner |  |  | ☐ |
| Engineering Lead |  |  | ☐ |
| QA Lead |  |  | ☐ |
| Security Reviewer |  |  | ☐ |
| Operations/DevOps |  |  | ☐ |

## 9. Post-Release Watch (First 24 Hours)
| Check | Frequency | Status |
| --- | --- | --- |
| Error rate monitoring | Every 30 min | ☐ |
| API latency check | Every 30 min | ☐ |
| DB health and connection pool | Every 30 min | ☐ |
| Lead capture and quotation conversion smoke | Every 2 hours | ☐ |
| Payment and refund workflow sanity | Every 2 hours | ☐ |
