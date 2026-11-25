# Architecture Decision Records

ADRs record decisions that change an architectural boundary, a contract, or a security property. Use this template:

```
# ADR-NNNN: Title
Status: Proposed | Accepted | Superseded by ADR-MMMM
Date: YYYY-MM-DD
Decision owner: name

## Context
## Decision
## Consequences
## Alternatives considered
## Tests or documents affected
```

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-0001](ADR-0001-core-is-authority.md) | Parmana Core is the sole authorization and signing authority, called as a separate service | Accepted (2026-11-25) |
| [ADR-0002](ADR-0002-fail-closed.md) | Fail closed on evaluation and evidence failures | Accepted (2026-11-25) |
| [ADR-0003](ADR-0003-tenant-context.md) | Explicit tenant context with composite keys and row-level security | Accepted (2026-11-25) |
| [ADR-0004](ADR-0004-queue.md) | PostgreSQL transactional outbox as the durable queue, behind a `JobQueue` interface | Accepted (2026-11-25) |
| [ADR-0005](ADR-0005-database-access.md) | Drizzle with reviewed SQL migrations | Accepted (2026-11-25) |
