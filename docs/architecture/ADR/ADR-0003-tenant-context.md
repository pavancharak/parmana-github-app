# ADR-0003: Explicit tenant context with composite keys and row-level security

Status: Accepted (2026-11-25, owner decision)
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

The product's core risk is cross-tenant data exposure (NFR-07, release blocking). Application-level filtering alone is a single point of failure.

## Decision

1. Tenant identity is derived from verified installation context only.
2. Services receive an explicit `TenantContext` argument; a lint rule enforces it.
3. Business tables use composite keys `(tenant_id, id)` and composite foreign keys.
4. PostgreSQL row-level security is enabled on all tenant tables for the application role, keyed by `app.tenant_id` set per transaction.
5. Migration and admin roles are separate and cannot be used by application code.

## Consequences

- Slightly more verbose queries and migrations.
- Connection pooling must reset `app.tenant_id` per transaction (`SET LOCAL`).
- RLS tests are required in CI (TEN-012).

## Alternatives considered

- Separate database per tenant: stronger isolation, higher operational cost; revisit for enterprise tier (deferred).
- Application filtering only: rejected as insufficient defense in depth.

## Tests or documents affected

`architecture/TENANT-ISOLATION.md`, `architecture/DATA-MODEL.md`, all TEN-* tests.
