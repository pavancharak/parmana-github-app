# Production Readiness

Document version: 1.0
A release is production-ready only when every gate below is satisfied with evidence in the results log. Passing tests alone is not sufficient (PRD §10).

## Gate 1: Functional completeness (Mandatory)

- [ ] All FR-01 to FR-13 acceptance criteria in `product/ACCEPTANCE-CRITERIA.md` pass.
- [ ] All `E2E-001` to `E2E-007` pass on staging.
- [ ] No placeholder functionality in critical workflows (installation, discovery, evaluation, check publication, approval, evidence).

## Gate 2: Security (Blocking)

- [ ] Cross-tenant attack suite (`TEN-*`, `E2E-005`) passes.
- [ ] Authentication and authorization reviewed (`SEC-AUTH-*`, `SEC-IDOR-01`).
- [ ] Secrets and signing keys protected (`SEC-TOK-01`, `SEC-KEY-01`, KMS policy review).
- [ ] Threat model reviewed and residual risks accepted in writing.
- [ ] Independent penetration test completed; no unresolved critical or high findings (NFR-01).
- [ ] Dependency and container scans clean of unresolved critical or high findings.

## Gate 3: Integrity (Blocking)

- [ ] Deterministic decisions verified (policy determinism check, `NORM-04`, `UT-011`).
- [ ] Evidence signatures verified (`CRY-*`).
- [ ] Ledger tampering detected (`CRY-003` to `CRY-008`, `RES-02`).
- [ ] Offline verification demonstrated (`E2E-007`) with network disabled.

## Gate 4: Reliability (Blocking)

- [ ] Webhook retries tested (`GH-008`, `PERF-004`).
- [ ] Queue recovery tested (`PERF-006`).
- [ ] Backup restoration tested (`RES-03`), with verification output recorded.
- [ ] No silent event loss (reconciliation job shows zero unterminated deliveries after failure injection).
- [ ] Performance profiles PERF-001 to PERF-010 run and recorded. Targets in NFR-02 and NFR-03 are either met or formally waived by the owner with reason.

## Gate 5: Operational readiness (Required)

- [ ] Monitoring and alerting active for all metrics in `MONITORING.md` §3.
- [ ] Runbooks in `INCIDENT-RESPONSE.md` reviewed; tabletop exercise completed.
- [ ] Rollback tested in staging (`DEPLOYMENT.md` §5).
- [ ] Support and incident procedures ready: contacts, customer support path, status page.
- [ ] Disaster recovery procedure documented and rehearsed (`BACKUP-RECOVERY.md` §7).

## Gate 6: Documentation and legal (Required)

- [ ] Customer-facing product language reviewed against `security/SECURITY-BOUNDARIES.md` §2 (DOC-01).
- [ ] Privacy notice and data processing terms reviewed by counsel (OD-06).
- [ ] Retention periods decided (OD-06).
- [ ] Open decisions relevant to launch are resolved (`product/OPEN-DECISIONS.md`).

## Required release metadata

Each production release records:

- Commit SHA and image digest.
- Results-log entry with test run IDs, runtime and pass/fail per suite.
- Schema versions of capability, policy, evidence and API contracts.
- Parmana Core version pinned.
- Approver and timestamp.
- Known issues accepted, with owner.

## Sign-off

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Product owner | | | |
| Security lead | | | |
| Engineering lead | | | |
| Operations lead | | | |
