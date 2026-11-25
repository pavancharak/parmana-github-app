# Acceptance Criteria

Document version: 1.0
Every criterion is written to be testable. Each criterion names the test IDs that prove it in `testing/TEST-CASES.md` or `testing/E2E-SCENARIOS.md`. A requirement is accepted only when all its criteria pass.

## FR-01 Installation and onboarding

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-01.1 | A valid installation creates exactly one tenant for its installation identity | GH-001 |
| AC-01.2 | Repeated installation callbacks do not create duplicate tenants | GH-002 |
| AC-01.3 | Repository selection is reflected in the tenant inventory | GH-003 |
| AC-01.4 | Uninstalled organizations cannot continue using the integration | GH-004, GH-005 |
| AC-01.5 | Installation tokens are never persisted as plaintext | Security test SEC-TOK-01 |
| AC-01.6 | Unknown or invalid installation identities are rejected | GH-001, TEN-005 |

## FR-02 Multi-tenant isolation

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-02.1 | Every business record contains a tenant association | Schema test DB-01 |
| AC-02.2 | Tenant identity is derived from verified installation context | TEN-005 |
| AC-02.3 | Client-supplied tenant IDs cannot override verified context | TEN-005 |
| AC-02.4 | Cross-tenant reads and writes are rejected | TEN-002, TEN-003, TEN-004 |
| AC-02.5 | Cache keys include tenant identity | TEN-007 |
| AC-02.6 | Background jobs retain their originating tenant context | TEN-006 |
| AC-02.7 | Key rotation for one tenant does not affect other tenants | TEN-009 |
| AC-02.8 | Tenant deletion follows an auditable retention and deletion process | TEN-011 |

## FR-03 Repository discovery

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-03.1 | Every supported fixture is discovered correctly | UT-001, UT-002, UT-003 |
| AC-03.2 | Duplicate files do not create duplicate agent identities | UT-002 (duplicate fixture), Phase 2 test DIS-02 |
| AC-03.3 | Deleted configuration files remove the corresponding active declaration | GH-013 |
| AC-03.4 | Unsupported formats are marked as unsupported | UT-004, DIS-03 |
| AC-03.5 | Secret values are redacted from findings and logs | SEC-RED-01 |
| AC-03.6 | Every scan is attributable to a repository commit | DIS-04 |

## FR-04 Capability normalization

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-04.1 | Equivalent configurations produce identical normalized records | UT-001, NORM-01 |
| AC-04.2 | Unknown permissions remain explicitly unknown | UT-012, NORM-02 |
| AC-04.3 | Every capability is traceable to its source | NORM-03 |
| AC-04.4 | Invalid records cannot enter an approved baseline | UT-015, BASE-03 |
| AC-04.5 | Normalization is deterministic across repeated runs | NORM-04 |

## FR-05 Baseline management

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-05.1 | Initial discovery does not automatically authorize capabilities | BASE-01 |
| AC-05.2 | Only authorized administrators can approve a baseline | AUTH-008, BASE-02 |
| AC-05.3 | Baseline changes create immutable version history | BASE-04 |
| AC-05.4 | Historical PR decisions retain their original baseline reference | BASE-05, CRY-003 |
| AC-05.5 | Unapproved changes cannot replace the active baseline | AUTH-009 |

## FR-06 Drift detection

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-06.1 | Every benchmark drift scenario is correctly classified | UT-006 to UT-009, DRIFT benchmark suite |
| AC-06.2 | Identical input and policy produce identical findings | UT-010, UT-011 |
| AC-06.3 | Permission reductions are not falsely classified as privilege expansion | AUTH-012 |
| AC-06.4 | Unknown capabilities are surfaced | UT-012 |
| AC-06.5 | Findings contain source file and commit references | NORM-03, DRIFT-04 |
| AC-06.6 | Repeated scans do not create duplicate findings | PERF-004, DRIFT-05 |

## FR-07 Policy engine

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-07.1 | Same input, policy and context always produce the same decision | UT-011, PERF-004 |
| AC-07.2 | Missing policies result in deny | UT-013 |
| AC-07.3 | Malformed policies result in deny | UT-014 |
| AC-07.4 | Unknown capabilities cannot bypass evaluation | UT-012 |
| AC-07.5 | Policy versions are preserved in decision evidence | CRY-004 |
| AC-07.6 | A policy update cannot retroactively alter historical decisions | AUTH-006, BASE-05 |

## FR-08 PR enforcement

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-08.1 | A PR with authorized changes receives a successful check | E2E-001, GH-017 |
| AC-08.2 | An unauthorized permission expansion fails the check | E2E-002 |
| AC-08.3 | Approval-required changes remain blocked until valid approval | AUTH-003, E2E-003 |
| AC-08.4 | An unavailable policy service fails closed | AUTH-007, E2E-006 |
| AC-08.5 | Repeated webhook deliveries do not duplicate decisions | GH-008, PERF-004 |
| AC-08.6 | New commits trigger fresh evaluations | GH-010 |
| AC-08.7 | Existing stale successful checks cannot authorize a changed commit | GH-018, E2E-004 |
| AC-08.8 | Check results reference the exact evaluated commit SHA | GH-017 |

## FR-09 Approvals

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-09.1 | Only authorized approvers can approve | AUTH-016, APR-01 |
| AC-09.2 | A developer cannot approve their own restricted change where separation of duties applies | AUTH-016 |
| AC-09.3 | Approval for one commit cannot authorize another commit | AUTH-013, E2E-004 |
| AC-09.4 | Expired approvals are rejected | AUTH-014 |
| AC-09.5 | Replayed approvals are rejected | AUTH-015 |
| AC-09.6 | Every approval is auditable | FR-13 audit test AUD-01 |
| AC-09.7 | Approval cannot override an absolute deny policy | AUTH-002, APR-02 |

## FR-10 Evidence

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-10.1 | Every completed policy decision produces evidence | CRY-001, E2E-003 |
| AC-10.2 | Every record is associated with a tenant and evaluated commit | CRY-005, CRY-006 |
| AC-10.3 | Any modification to signed evidence causes verification failure | CRY-003 to CRY-006 |
| AC-10.4 | Evidence can be verified without accessing the original GitHub installation | CRY-011, E2E-007 |
| AC-10.5 | Public verification keys are identifiable and versioned | CRY-009 |
| AC-10.6 | Failed evidence persistence cannot result in a falsely successful enforcement check | CRY-012 |
| AC-10.7 | Ledger integrity can be verified after service restart | CRY-007, CRY-008, RES-01 |

## FR-11 Dashboard

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-11.1 | Users see only their organization's data | TEN-010 |
| AC-11.2 | Dashboard counts reconcile with underlying records | DASH-01 (Phase 6) |
| AC-11.3 | Filters work across repository, agent, date and decision | DASH-02 (Phase 6) |
| AC-11.4 | Users can open the originating GitHub PR | DASH-03 (Phase 6) |
| AC-11.5 | Evidence details include verification status | DASH-04 (Phase 6) |
| AC-11.6 | Unauthorized users cannot access administrative functions | RBAC-01 (Phase 6) |
| AC-11.7 | Empty, loading and error states are implemented | DASH-05 (Phase 6) |
| AC-11.8 | Sensitive configuration values are never displayed | SEC-RED-02 |

## FR-12 Notifications

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-12.1 | Critical events generate notifications | NOT-01 |
| AC-12.2 | Repeated webhook events do not produce duplicate notifications | NOT-02 |
| AC-12.3 | Notification failure does not silently lose the underlying decision | NOT-03 |
| AC-12.4 | Notification content does not expose secrets | SEC-RED-03 |

## FR-13 Audit and administration

| ID | Criterion | Tests |
| --- | --- | --- |
| AC-13.1 | Administrative changes are auditable | AUD-01 |
| AC-13.2 | Audit events cannot be modified through ordinary application APIs | AUD-02 |
| AC-13.3 | Audit access is role-controlled | RBAC-02 |
| AC-13.4 | Data export is tenant-scoped | TEN-004, AUD-03 |
| AC-13.5 | Deletion respects legal retention obligations and documented evidence retention policies | TEN-011, OD-06 |

## Release-level acceptance

The release is accepted only when:

1. All `E2E-001` to `E2E-007` scenarios pass.
2. All `TEN-*` tests pass. These are release blocking.
3. All `CRY-*` tests pass.
4. The release gates in `operations/PRODUCTION-READINESS.md` are satisfied.
