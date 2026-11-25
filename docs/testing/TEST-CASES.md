# Test Case Catalogue

Document version: 1.0
Every requirement ID in `product/` maps to at least one test here or in `E2E-SCENARIOS.md` or `SECURITY-TEST-PLAN.md`. The traceability matrix (§12) is checked in CI: a requirement with no test is a failed gate.

Test IDs are stable. A test is never renumbered; a retired test is marked `RETIRED` with a reason.

Status column: **Spec** = defined in the product specification §8; **Added** = defined in this baseline to close a traceability gap.

---

## 1. Unit tests (`tests/unit`)

| ID | Test scenario | Expected result | Source |
| --- | --- | --- | --- |
| UT-001 | Parse valid Claude configuration | Correct capability model | Spec |
| UT-002 | Parse valid agent instructions | Supported metadata discovered | Spec |
| UT-003 | Parse valid MCP configuration | Servers and tools identified | Spec |
| UT-004 | Parse malformed JSON | Controlled validation failure | Spec |
| UT-005 | Parse missing configuration | No false agent discovery | Spec |
| UT-006 | Detect filesystem read-to-write change | Permission expansion detected | Spec |
| UT-007 | Detect shell permission addition | New capability detected | Spec |
| UT-008 | Detect unrestricted network access | Scope expansion detected | Spec |
| UT-009 | Detect production access declaration | Critical finding generated | Spec |
| UT-010 | Compare identical configurations | No drift | Spec |
| UT-011 | Compare identical policy inputs | Identical decision | Spec |
| UT-012 | Evaluate unknown capability | Deny or approval according to explicit policy | Spec |
| UT-013 | Evaluate missing policy | Deny | Spec |
| UT-014 | Evaluate malformed policy | Fail closed | Spec |
| UT-015 | Validate capability schema version | Correct compatibility handling | Spec |
| DIS-02 | Same file discovered from two paths (duplicate) | One agent identity; one configuration record per commit and path | Added (AC-03.2) |
| DIS-03 | Unsupported format in `.claude/` (unknown file type) | Marked `unsupported`; not analyzed; listed in report | Added (AC-03.4) |
| DIS-04 | Scan record | Every scan row has non-null `commit_sha` | Added (AC-03.6) |
| NORM-01 | Two configs differing only in key order and whitespace | Identical canonical records and digests | Added (AC-04.1) |
| NORM-02 | Permission string not in mapping table | Output `unknown`, provenance `unknown`, never `read` or `none` | Added (AC-04.2) |
| NORM-03 | Every capability record | `source.path`, `source.commit_sha`, `source.pointer` present | Added (AC-03/04/06.5) |
| NORM-04 | Normalize same input 100 times in one process and across two processes | Byte-identical output | Added (AC-04.5) |
| DRIFT-04 | Drift finding for scope expansion | Finding includes both source references | Added (AC-06.5) |
| DRIFT-05 | Re-run identical scan | No new `drift_findings` rows | Added (AC-06.6) |
| DRIFT-06 | File renamed with identical content | Reconciled as rename, not delete plus add | Added (GH-012, T-08) |
| BASE-01 | Initial discovery | Baseline in `draft`; no capability marked approved | Added (AC-05.1) |
| BASE-02 | Approve baseline as proposer | Rejected | Added (AC-05.2) |
| BASE-03 | Approve baseline containing `unknown` record | Rejected by validation | Added (AC-04.4) |
| BASE-04 | Publish new baseline version | Earlier version unchanged; new version row created | Added (AC-05.3) |
| BASE-05 | Policy or baseline change after PR evaluation | Historical evaluation still references original versions | Added (AC-05.4, AC-07.6) |
| APR-01 | Approval by user not in approver group | Rejected | Added (AC-09.1) |
| APR-02 | Approval for request where policy is absolute deny | Rejected; decision remains `deny` | Added (AC-09.7) |

## 2. GitHub integration tests (`tests/github`)

| ID | Test scenario | Expected result | Source |
| --- | --- | --- | --- |
| GH-001 | New organization installs App | Tenant created | Spec |
| GH-002 | Duplicate installation callback | No duplicate tenant | Spec |
| GH-003 | Selected repositories installation | Only selected repositories accessible | Spec |
| GH-004 | Installation suspended | Processing stopped | Spec |
| GH-005 | Installation removed | Access revoked and lifecycle recorded | Spec |
| GH-006 | Valid webhook signature | Event accepted | Spec |
| GH-007 | Invalid webhook signature | Request rejected | Spec |
| GH-008 | Duplicate webhook delivery | Idempotent result | Spec |
| GH-009 | PR opened | Evaluation triggered | Spec |
| GH-010 | PR synchronized | New commit evaluated | Spec |
| GH-011 | PR reopened | Appropriate evaluation resumed | Spec |
| GH-012 | Configuration file renamed | Old and new paths reconciled | Spec |
| GH-013 | Configuration file deleted | Drift or removal recorded | Spec |
| GH-014 | Repository access revoked | No unauthorized content retrieval | Spec |
| GH-015 | GitHub API rate limit | Controlled retry | Spec |
| GH-016 | GitHub API unavailable | Durable retry and safe check state | Spec |
| GH-017 | PR check publication | Correct status and commit reference | Spec |
| GH-018 | Stale worker result | Cannot overwrite newer commit result | Spec |

## 3. Authorization and policy tests (`tests/unit`, `tests/integration`)

| ID | Test scenario | Expected result | Source |
| --- | --- | --- | --- |
| AUTH-001 | Capability explicitly allowed | Allow | Spec |
| AUTH-002 | Capability explicitly denied | Deny | Spec |
| AUTH-003 | Capability requires approval | Approval required | Spec |
| AUTH-004 | No matching rule | Deny | Spec |
| AUTH-005 | Conflicting rules | Documented precedence applied (POLICY-SCHEMA §3.3) | Spec |
| AUTH-006 | Policy version changes | New evaluation uses new version | Spec |
| AUTH-007 | Policy evaluation timeout | Fail closed | Spec |
| AUTH-008 | Unauthorized policy modification | Rejected | Spec |
| AUTH-009 | Baseline not approved | Cannot authorize from it | Spec |
| AUTH-010 | Policy rollback | Earlier version restored as a new active version | Spec |
| AUTH-011 | Capability scope expansion | Evaluated as privilege expansion | Spec |
| AUTH-012 | Capability scope reduction | No false privilege escalation | Spec |
| AUTH-013 | Approval for wrong commit | Rejected | Spec |
| AUTH-014 | Expired approval | Rejected | Spec |
| AUTH-015 | Replayed approval | Rejected | Spec |
| AUTH-016 | Developer self-approval | Rejected where prohibited | Spec |

## 4. Multi-tenant security tests (`tests/isolation`) — RELEASE BLOCKING

| ID | Test scenario | Expected result | Source |
| --- | --- | --- | --- |
| TEN-001 | Organization A reads its own data | Allowed | Spec |
| TEN-002 | Organization A reads B's policies | Denied (404) | Spec |
| TEN-003 | Organization A modifies B's baseline | Denied | Spec |
| TEN-004 | Organization A retrieves B's evidence | Denied | Spec |
| TEN-005 | Client changes tenant ID | Rejected | Spec |
| TEN-006 | Background job uses wrong tenant | Rejected | Spec |
| TEN-007 | Cache key collision between tenants | No data leakage | Spec |
| TEN-008 | Cross-tenant webhook injection | Rejected | Spec |
| TEN-009 | Organization A rotates signing key | B unaffected | Spec |
| TEN-010 | Organization A user accesses B's dashboard | Denied | Spec |
| TEN-011 | Tenant deletion | Correct tenant-only deletion | Spec |
| TEN-012 | Database RLS bypass attempt | Rejected for application role | Spec |

## 5. Cryptographic evidence tests (`tests/integration`) — RELEASE BLOCKING

| ID | Test scenario | Expected result | Source |
| --- | --- | --- | --- |
| CRY-001 | Generate evidence record | Valid signature | Spec |
| CRY-002 | Verify original record | Verification passes | Spec |
| CRY-003 | Modify decision field | Verification fails | Spec |
| CRY-004 | Modify policy digest | Verification fails | Spec |
| CRY-005 | Modify commit SHA | Verification fails | Spec |
| CRY-006 | Modify tenant identity | Verification fails | Spec |
| CRY-007 | Delete ledger record | Integrity failure detected | Spec |
| CRY-008 | Reorder records | Chain verification fails | Spec |
| CRY-009 | Rotate signing key | Historical evidence remains verifiable | Spec |
| CRY-010 | Verify using wrong trust root | Verification fails | Spec |
| CRY-011 | Export and offline verification | Verification passes | Spec |
| CRY-012 | Evidence persistence failure | Enforcement cannot report success without required evidence | Spec |

## 6. Security and resilience test references

Security tests (`SEC-*`), resilience (`RES-*`) and performance (`PERF-*`) are defined in `SECURITY-TEST-PLAN.md` and `TEST-STRATEGY.md`. Referenced here for traceability:

| ID | Scenario | Defined in |
| --- | --- | --- |
| SEC-TOK-01 | Installation token not present in DB, logs or cache dumps | SECURITY-TEST-PLAN §3 |
| SEC-RED-01/02/03 | Secret redaction in findings, dashboard, notifications | SECURITY-TEST-PLAN §3 |
| SEC-WH-01/02 | Webhook signature attacks and replay | SECURITY-TEST-PLAN §2 |
| SEC-PARSE-01/02 | Malicious config parsing | SECURITY-TEST-PLAN §2 |
| SEC-PATH-01, SEC-SSRF-01 | Path traversal and SSRF via repository content | SECURITY-TEST-PLAN §2 |
| SEC-CHK-01 | Forged check output rejected | SECURITY-TEST-PLAN §2 |
| SEC-IDOR-01, SEC-CSRF-01, SEC-AUTH-01 | Object-level authorization, CSRF, session handling | SECURITY-TEST-PLAN §4 |
| RES-01, RES-02 | Ledger integrity after restart; gap detection | SECURITY-TEST-PLAN §6 |
| DB-01 | Every business table has `tenant_id` not null | `tests/integration` schema test |
| PERF-001 to PERF-010 | Concurrency, load and failure recovery | TEST-STRATEGY §6 |
| AUD-01/02/03 | Audit creation, immutability, tenant-scoped export | E2E-005 and `tests/integration` |
| RBAC-01/02 | Admin function denial; auditor read-only | `tests/isolation` |
| DASH-01 to DASH-05 | Dashboard reconciliation, filters, PR link, verification status, states | `tests/e2e` (Phase 6) |
| NOT-01 to NOT-04 | Notification generation, dedup, failure handling, links | `tests/integration` (Phase 5–6) |
| OPS-ACC-01 | Vendor access audit | `operations/MONITORING.md` |
| DOC-01 | Product language review of non-claims | Release checklist |

## 7. Test data

- Fixtures live under `tests/fixtures/` with one directory per supported format, each containing: `valid/`, `malformed/`, `renamed/`, `unsupported/`, and `expected/` (canonical output and digest).
- Benchmark drift corpus: one fixture pair (base, head) per drift type in FR-06, plus a no-change pair and a reduction pair.
- No fixture contains real credentials. Secret-looking values are generated with a known prefix and are scanned for in CI.

## 8. Traceability matrix (requirement → tests)

| Requirement | Tests |
| --- | --- |
| FR-01 | GH-001 to GH-005, AC-01.5, AC-01.6 |
| FR-02 | TEN-001 to TEN-012, DB-01 |
| FR-03 | UT-001 to UT-005, DIS-02 to DIS-04, GH-012, GH-013 |
| FR-04 | UT-015, NORM-01 to NORM-04, UT-012 |
| FR-05 | BASE-01 to BASE-05 |
| FR-06 | UT-006 to UT-011, DRIFT-04 to DRIFT-06 |
| FR-07 | UT-011 to UT-014, AUTH-001 to AUTH-012 |
| FR-08 | GH-006 to GH-018, E2E-001, E2E-002, E2E-006 |
| FR-09 | APR-01, APR-02, AUTH-013 to AUTH-016, E2E-003, E2E-004 |
| FR-10 | CRY-001 to CRY-012, E2E-007, RES-01, RES-02 |
| FR-11 | TEN-010, RBAC-01, RBAC-02, DASH-01 to DASH-05 |
| FR-12 | NOT-01 to NOT-04, SEC-RED-03 |
| FR-13 | AUD-01 to AUD-03, TEN-011 |
| NFR-01 | SECURITY-TEST-PLAN (all) |
| NFR-02 | PERF-010, monitoring SLO |
| NFR-03 | PERF-001, PERF-010 |
| NFR-04 | PERF-002 |
| NFR-05 | GH-016, PERF-005, PERF-006 |
| NFR-06 | CRY-* |
| NFR-07 | TEN-* |
| NFR-08 | Monitoring verification (MONITORING §6) |
| NFR-09 | RES-03 (restore test) |
| NFR-10 | Schema contract tests (`tests/unit`, SCHEMA-*) |
| NFR-11 | Accessibility test ACC-01 (Phase 6) |
| NFR-12 | SEC-RED-*, TEN-011 |

Every story in `product/USER-STORIES.md` references test IDs that exist in this catalogue or in `E2E-SCENARIOS.md`.
