# Deployment

Document version: 1.0
Status: Proposed. Infrastructure is defined as code in `infrastructure/terraform/` in Phase 7.

## 1. Environments

| Environment | Purpose | Data | GitHub App |
| --- | --- | --- | --- |
| Local | Development | Synthetic | Local App with tunnel, dev key |
| CI | Automated tests | Fixtures | Recorded fixtures; sandbox App for nightly |
| Staging | E2E, performance, security testing | Synthetic only | Staging App |
| Production | Customers | Customer data | Production App |

No production data is copied to non-production environments.

## 2. Components to deploy

- `apps/api` (stateless container).
- `apps/worker` (stateless container; horizontally scalable, NFR-04).
- `apps/dashboard` (static or server-rendered; hosting TBD, OD-12).
- Managed PostgreSQL with automated backups and point-in-time recovery.
- Queue per ADR-0004.
- KMS keys per tenant (alias convention in `security/CRYPTOGRAPHIC-EVIDENCE.md`).
- Secret store for App private key and webhook secret.
- OpenTelemetry collector and metrics backend (`operations/MONITORING.md`).

## 3. Release process

1. Merge to protected main branch only after required checks pass (see `testing/TEST-STRATEGY.md` §4).
2. Build immutable container image; tag by commit SHA; scan image; generate SBOM.
3. Deploy to staging. Run E2E suite and evidence integrity evaluation.
4. Record results in the results log with commit SHA.
5. Approval by the release owner (protected environment with required reviewer).
6. Deploy to production with canary: one worker pool, then full rollout after health checks pass for the defined window (TBD).
7. Run post-deploy verification: installation webhook ping, a synthetic PR evaluation in the internal test organization, evidence verification of the synthetic record.

## 4. Database migrations

- Forward-only, reviewed SQL in `database/migrations/`.
- Backward-compatible expand-then-contract pattern: additive migration first, code change second, cleanup later.
- Migrations run under `parmana_migrator` role only, never under the application role.
- A migration that touches `evidence_records` or `audit_events` requires an additional reviewer and a restore test first.

## 5. Rollback

- Application rollback: redeploy the previous image digest. Must be possible without a schema rollback because migrations are backward compatible.
- Rollback is rehearsed in staging before the first production release (PRODUCTION-READINESS gate 5).
- Rolling back never deletes evidence. Records written by the newer version remain valid under the older verifier because the evidence schema version is in each record.

## 6. Configuration

- Configuration via environment variables and secret store references. No secrets in images or repositories.
- Feature flags are not used to bypass enforcement. A flag that disables a check is prohibited.

## 7. Network

- Webhook endpoint is public; API and dashboard are behind TLS with HSTS.
- Worker egress is restricted to the GitHub API, the Core service, KMS and the telemetry collector. No other egress (threat T-06).
- Database is reachable only from application subnets.

## 8. Deployment verification

| Check | Pass |
| --- | --- |
| `/healthz` (liveness) | 200 |
| `/readyz` (database, queue, Core, KMS reachable) | 200 |
| Webhook signature test with test secret | 202 |
| Synthetic evaluation end to end | Check Run created; evidence verifies |

A failed readiness check blocks traffic. A failed synthetic evaluation triggers rollback review.
