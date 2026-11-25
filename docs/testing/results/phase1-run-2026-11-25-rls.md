# Phase 1 test run 3: row-level security, entrypoint and live HTTP check

Date: 2026-11-25
Branch: `claude/phase1-github-integration`
Runtime here: Linux, Node v22.23.5, pnpm 10.28.0, Vitest 3.2.7, PostgreSQL 16.15 (local test cluster)

## Unit and integration tests

```
pnpm run typecheck                                  # tsc --noEmit: exit 0
PG_ADMIN_URL=postgres://postgres@127.0.0.1:54399/postgres pnpm run test:unit
```

```
 ✓ apps/github-app/test/webhook.test.ts (20 tests) 13ms
 ✓ apps/github-app/test/server.test.ts (6 tests) 81ms
 ✓ apps/github-app/test/pg.integration.test.ts (15 tests) 248ms
 ✓ packages/github-client/test/app-auth.test.ts (5 tests) 8ms
 ✓ packages/github-client/test/rest.test.ts (19 tests) 8ms
 ✓ packages/github-client/test/signature.test.ts (7 tests) 4ms
 ✓ packages/tenant-context/test/tenant-context.test.ts (3 tests) 3ms
 Test Files  7 passed (7)
      Tests  75 passed (75)
```

The PostgreSQL file runs as the `parmana_app` role. It covers RLS reads, writes, updates, the unset-tenant case, and the ingress lookup (TEN-002, TEN-003, TEN-004, TEN-012).

## Live entrypoint check

The process was started with `pnpm run start` against a new database. Migrations ran as the owner role (2 applied). The app ran as `parmana_app`.

| Request | Response |
| --- | --- |
| GET /healthz | 200 `{"status":"ok"}` |
| GET /readyz | 200 `{"status":"ready"}` |
| POST /webhooks/github, valid signature, `installation.created` | 202 `accepted` |
| Same delivery replayed | 200 `duplicate` |
| POST with an invalid signature | 401 `bad_signature` |

Database afterward: 1 installation, 1 repository, 1 audit event. The process shut down cleanly on SIGTERM.

## Not run

- Container image build and the compose stack. No Docker daemon was reachable.
- Any call to the real GitHub API. This needs the App credentials and outbound access to api.github.com.
- Node 24. This run used Node 22.
