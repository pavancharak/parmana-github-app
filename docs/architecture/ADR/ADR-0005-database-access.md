# ADR-0005: Database access layer

Status: Proposed — decision required before Phase 1
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

The spec lists Prisma or Drizzle. Composite keys, row-level security, `SET LOCAL` per transaction and partial unique indexes must be expressible without workarounds.

## Options

- **Drizzle**: SQL-close, explicit composite keys and policies in schema code, lightweight runtime.
- **Prisma**: mature migrations and tooling; RLS and some composite constructs require raw SQL migrations.

## Recommendation

Drizzle, with migrations as reviewed SQL files in `database/migrations/`. Raw SQL is acceptable for RLS policies and immutability grants.

## Decision needed

Owner to confirm.
