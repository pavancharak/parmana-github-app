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
