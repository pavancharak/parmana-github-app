# ADR-0005: Database access layer

Status: Accepted (2026-11-25, owner decision): Drizzle
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

The spec lists Prisma or Drizzle. Composite keys, row-level security, `SET LOCAL` per transaction and partial unique indexes must be expressible without workarounds.

## Options

- **Drizzle**: SQL-close, explicit composite keys and policies in schema code, lightweight runtime.
- **Prisma**: mature migrations and tooling; RLS and some composite constructs require raw SQL migrations.

## Recommendation

Drizzle, with migrations as reviewed SQL files in `database/migrations/`. Raw SQL is acceptable for RLS policies and immutability grants.

## Decision

Drizzle, with reviewed SQL migrations in `database/migrations/`, accepted as the long-term database access layer.

- RLS policies, immutability grants and the `SET LOCAL app.tenant_id` pattern are written as reviewed SQL (ADR-0003).
- Prisma is not used. Changing the access layer requires a superseding ADR.
