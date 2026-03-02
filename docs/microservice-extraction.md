# Converting a Module to a Microservice Later

This codebase is prepared for incremental extraction because each feature module already isolates API, business logic, persistence access, and events.

## Example: Extract `bookings` Module

1. Freeze module contract.
- Keep the service API stable (`create`, `update`, `getById`, `list`).
- Keep request/response schemas stable at the edge.

2. Split package boundary.
- Move `src/modules/bookings` into a new repository/service package.
- Copy shared primitives needed by the module (`AppError`, logger adapter, validation middleware wrapper).

3. Replace in-process dependencies.
- Replace in-memory repository with real DB adapter in the new service.
- Replace in-process event bus with message broker publisher (Kafka/RabbitMQ/SNS/SQS).

4. Add service transport edge.
- Keep HTTP routes first for low-friction migration.
- Optionally add async command/event consumers for internal integrations.

5. Introduce anti-corruption layer in monolith.
- In the monolith, swap direct `createBookingsModule()` usage with a client adapter (`BookingsClient`) that calls the new service.
- Keep the same service interface for upstream callers to avoid breaking changes.

6. Data ownership and consistency.
- Assign `bookings` table ownership to the new service.
- Use outbox/inbox patterns for cross-module eventual consistency.

7. Operational hardening.
- Add health/readiness endpoints, tracing, request IDs, and circuit breakers.
- Configure retries, idempotency keys, and DLQ for async flows.

## Why This Structure Makes Extraction Easy

- Feature folder already contains all required parts.
- Module entry file (`index.js`) is a stable composition boundary.
- DI wiring allows swapping infrastructure without changing business logic.
- RBAC and auth can be kept centralized initially, then federated later.
