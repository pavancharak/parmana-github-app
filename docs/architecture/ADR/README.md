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
| [ADR-0001](ADR-0001-core-is-authority.md) | Parmana Core is the sole authorization and signing authority | Proposed |
| [ADR-0002](ADR-0002-fail-closed.md) | Fail closed on evaluation and evidence failures | Proposed |
| [ADR-0003](ADR-0003-tenant-context.md) | Explicit tenant context with composite keys and RLS | Proposed |
| [ADR-0004](ADR-0004-queue.md) | Durable queue technology | Proposed (decision required; see OD-03) |
| [ADR-0005](ADR-0005-database-access.md) | Database access layer | Proposed (decision required) |
| [ADR-0007](ADR-0007-plan-entitlements.md) | Plan entitlements and report-only mode | Accepted (2026-11-26) |
| [ADR-0008](ADR-0008-approval-identity-and-signing-custody.md) | Approval identity and signing key custody | Accepted (2026-11-26) |
