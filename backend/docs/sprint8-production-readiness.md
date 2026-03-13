# Sprint 8 - Production Readiness Baseline

## 1. Objective
Harden runtime behavior for UAT and production deployments without changing business workflows.

## 2. Implemented in This Sprint

## 2.1 Health and Readiness
New endpoints:
1. `GET /health`
2. `GET /health/live`
3. `GET /health/ready`

Behavior:
1. `/health` returns service metadata and uptime.
2. `/health/live` confirms process liveness.
3. `/health/ready` performs application readiness checks, including DB health.
4. `/health/ready` returns `503` when server is draining for shutdown.

## 2.2 Database Health Checks
Database adapters now support:
1. `healthCheck({ timeoutMs })`
2. `close()`

PostgreSQL adapter:
1. Executes `SELECT 1` with timeout.
2. Returns latency and timestamp.

In-memory adapter:
1. Returns immediate `ok` health response.

## 2.3 Graceful Shutdown
Server now handles:
1. `SIGINT`
2. `SIGTERM`

Shutdown flow:
1. Mark runtime as draining.
2. Reject readiness (`/health/ready` => `503`).
3. Close HTTP server.
4. Close Socket.IO server.
5. Close DB connection pool.
6. Force-exit if timeout exceeded.

## 2.4 Environment Baseline
Added new environment controls:
1. `APP_VERSION`
2. `HEALTH_DB_TIMEOUT_MS`
3. `SHUTDOWN_TIMEOUT_MS`

Also added `.env.example` for clean setup.

## 2.5 Smoke Test
Added `scripts/test-sprint8.js` and npm command:
1. `npm run test:sprint8`

Latest run status:
1. PASS (5/5)

Coverage:
1. `/health` response
2. `/health/live` response
3. `/health/ready` when healthy
4. `/health/ready` during shutdown-drain mode
5. `/metrics` and `/metrics/json` response validation

## 2.6 Metrics Endpoint
Added:
1. `GET /metrics` (Prometheus format)
2. `GET /metrics/json` (JSON snapshot)

Security:
1. Optional token gate using `METRICS_TOKEN` header `x-metrics-token`.

Config:
1. `METRICS_ENABLED=true|false`
2. `METRICS_TOKEN=<optional-secret>`

## 2.7 Backup and Restore Automation
Added scripts:
1. `npm run db:backup`
2. `npm run db:restore -- --file=<backup-path> --yes`

Implementation:
1. `scripts/backup-db.js` (`pg_dump`)
2. `scripts/restore-db.js` (`pg_restore` or `psql` for `.sql`)

## 2.8 Operational Playbooks
Added:
1. `docs/disaster-recovery-runbook.md`
2. `docs/alerting-oncall-playbook.md`
3. `docs/uat-go-live-checklist.md`

## 3. Operational Checklist
Use before go-live:
1. Confirm `DATABASE_URL` points to production/staging DB.
2. Set strong `JWT_ACCESS_SECRET`.
3. Set correct `CORS_ORIGIN`.
4. Tune `HEALTH_DB_TIMEOUT_MS` by environment latency.
5. Tune `SHUTDOWN_TIMEOUT_MS` for load balancer drain window.
6. Set `METRICS_ENABLED` and `METRICS_TOKEN` according to monitoring policy.
7. Run migration and seed scripts in order.
8. Run and verify backup + restore drill.
9. Run all sprint smoke tests.
10. Verify readiness endpoint from orchestrator/load balancer.
11. Verify metrics scrape from monitoring system.

## 4. Pending for Full Production Completion
1. Execute DR drill on staging and record achieved RTO/RPO.
2. Wire alert rules in monitoring stack according to on-call playbook.
3. Collect final business UAT signoffs.
