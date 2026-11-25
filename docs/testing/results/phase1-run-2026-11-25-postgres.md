# Phase 1 test run 2: transactional persistence, HTTP server, token handling, repository access, Check Runs

Date: 2026-11-25
Branch: `claude/phase1-github-integration`
Runner: Linux, Node v22.23.5, pnpm 10.28.0, Vitest 3.2.7, PostgreSQL 16.15 (local cluster, test-only)

## Commands

```
pnpm install
pnpm run typecheck                 # tsc --noEmit: exit 0
pnpm run test:unit                 # without PG_ADMIN_URL: 60 pass, 8 skipped
PG_ADMIN_URL=postgres://postgres@127.0.0.1:54399/postgres pnpm run test:unit
                                   # with PostgreSQL: 68 pass, 0 skipped
```

## Results (with PostgreSQL)

| File | Tests | Result |
| --- | --- | --- |
| packages/tenant-context/test/tenant-context.test.ts | 3 | pass |
| packages/github-client/test/signature.test.ts | 7 | pass |
| packages/github-client/test/app-auth.test.ts | 5 | pass |
| packages/github-client/test/rest.test.ts | 19 | pass |
| apps/github-app/test/webhook.test.ts | 20 | pass |
| apps/github-app/test/server.test.ts | 6 | pass |
| apps/github-app/test/pg.integration.test.ts | 8 | pass |
| **Total** | **68** | **68 pass, 0 fail** |

Test databases are created per run and dropped afterward. Checked afterward: 0 leftover `parmana_test_*` databases.

## What the PostgreSQL tests prove

| Test | Requirement |
| --- | --- |
| migrations apply once; re-run applies nothing | DB-01 setup, NFR-10 |
| audit_events rejects UPDATE and DELETE | AC-13.2 |
| invalid status and duplicate installation ID rejected by constraints | AC-01.1, DATA-MODEL §4 |
| audit failure rolls back tenant, installation, repositories and delivery claim; retry succeeds | GH-008, atomicity |
| five simultaneous `created` events for one installation create exactly one tenant | AC-01.1, AC-01.2 (concurrent) |
| five simultaneous copies of one delivery are processed exactly once | GH-008 (concurrent) |
| repository access allowed for an active repo, denied for others and after removal | GH-003, GH-014 |
| a pull request job is queued under the stored tenant, in the same transaction as the delivery claim | TEN-005, NFR-05 |

## Corrections made during this run

Four tests failed on the first run. The causes were fixed in code, not by relaxing the tests:

1. Fastify's built-in JSON parser ran before the raw-body parser, so the signature was checked against re-serialized bytes. Fixed by removing the built-in parsers.
2. A malformed installation payload committed its delivery claim before validation. Fixed by validating before the transaction opens.
3. The retry test expected the wrong tenant ID. The failed attempt consumed an ID but never committed it, so the retry correctly receives the next one. Test corrected.

## Not covered

- Repository discovery is covered at the unit level only: path selection, sorting, truncation handling and pagination. No end-to-end test against GitHub.
- Installation token minting is covered against a fake fetch. It has not been run against GitHub's API.
- Check Run publication is covered against a fake fetch. It has not been published to a real pull request.
- Tenant-scoped row-level security (TEN-012) is not implemented. The current tables have no RLS policies.
- Concurrency tests use one PostgreSQL instance. Behaviour under failover or connection loss (PERF-005) is not tested.
- Node 24 (the spec target) is not tested. This run used Node 22.
