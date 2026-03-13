# Alerting and On-Call Playbook

## 1. Objective
Define minimum alerting signals and first-response actions for production stability.

## 2. Alert Categories
| Category | Trigger | Severity |
| --- | --- | --- |
| Availability | `/health/ready` non-200 for 3 consecutive checks | P1 |
| API errors | 5xx rate > 3% for 5 min | P1 |
| Latency | p95 API latency > 1200ms for 10 min | P2 |
| DB health | DB readiness check failure | P1 |
| Lead pipeline | webhook capture failure spike | P2 |
| Payment flow | payment verify endpoint failure spike | P1 |

## 3. Notification Routing
| Severity | Route |
| --- | --- |
| P1 | Pager + Slack/Teams + Incident call |
| P2 | Slack/Teams + ticket |
| P3 | Ticket only |

## 4. First Response SOP
1. Acknowledge alert within 5 minutes (P1) or 15 minutes (P2).
2. Check health endpoints and recent deployment history.
3. Check DB connectivity and saturation.
4. Inspect structured logs for affected route/module.
5. If customer-impacting, initiate incident bridge and status update.
6. Apply rollback or mitigation.
7. Track timeline and actions in incident note.

## 5. Module-Specific Quick Checks
| Module | Quick Check |
| --- | --- |
| Auth | Login success rate and token errors |
| Leads/Webhooks | Recent webhook 4xx/5xx and lead creation counts |
| Quotations | Create/send status transition errors |
| Bookings/Payments | Verification and status sync failures |
| Visa | Status transition and document operations failures |
| Reports | Heavy query latency and timeout spikes |

## 6. Escalation Matrix
| Level | Owner |
| --- | --- |
| L1 | On-call backend engineer |
| L2 | Engineering lead |
| L3 | DevOps lead + Product owner |

## 7. Closure Criteria
1. Alert condition cleared for at least 30 minutes.
2. Impact scope documented.
3. Root cause and prevention action items logged.
