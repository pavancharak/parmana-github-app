# parmana-github-app

Parmana Agent Permission Control: a GitHub App that discovers AI agent configurations, establishes approved capability baselines, detects permission drift, enforces policy at pull request checks, and produces independently verifiable evidence through Parmana Core.

**Status: Phase 0 — documentation and contracts. No application code exists yet.**

## Start here

- [docs/README.md](docs/README.md): documentation index, reading order and the Phase 0 exit checklist.
- [docs/product/PRD.md](docs/product/PRD.md): product vision, scope and release 1.0 boundaries.
- [docs/product/OPEN-DECISIONS.md](docs/product/OPEN-DECISIONS.md): decisions that block Phase 1.

## Principles

1. Parmana Core is the authority for decisions and proof.
2. Unknown is never safe.
3. Fail closed.
4. No tenant context, no access.
5. No valid authorization, no successful enforcement check.
6. No verifiable evidence, no claim of completed proof.

Parmana reports what is *declared* in repositories. It does not prove what an agent executed at runtime.

## Build order

Code is not started until the Phase 0 exit checklist in `docs/README.md` is complete. Implementation then follows the phases in `docs/product/PRD.md` and the exit gates in `docs/operations/PRODUCTION-READINESS.md`.

## Running the code (Phase 1)

Requirements: Node 22 or later (Node 24 is the target in the specification), pnpm 10.

```
pnpm install
pnpm run typecheck
pnpm run test:unit                    # database tests are skipped without PG_ADMIN_URL
PG_ADMIN_URL=postgres://postgres@127.0.0.1:5432/postgres pnpm run test:integration
```

`PG_ADMIN_URL` must point to a PostgreSQL role that can create and drop databases. Each run creates its own database and drops it afterward. Migrations live in `database/migrations/` and are applied by `apps/github-app/src/pg/migrate.ts`.

Status: webhook handling, installation lifecycle, repository selection, PostgreSQL persistence, HTTP receipt, installation tokens (in memory only), repository discovery, and Check Run publication are implemented with tests. Not yet implemented: deployment wiring, tenant row-level security, and the production GitHub API integration beyond fake-fetch tests. See `docs/testing/results/` for recorded runs.
