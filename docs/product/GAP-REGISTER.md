# Gap register: what is still to build

Status as of 2026-11-26. This is the list of work not yet done, for launch. Each item names the requirement it serves, what blocks it, and how we will know it is complete.

Status key: **Not started**, **Blocked** (cannot proceed until the named blocker clears), **Partial** (some parts built).

## A. Deployment and platform

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-01 | App Runner service running | NFR-02, FR-08 | Blocked | AWS account restriction (cases 179565931200998 and 179520203500307) | `/healthz` and `/readyz` return 200 on the public host |
| G-02 | Public HTTPS webhook endpoint configured on the GitHub App | FR-01, FR-08 | Blocked | G-01 | GitHub "Recent deliveries" shows a 202 for a ping and an installation event |
| G-03 | Container image rebuilt through CI and tagged by commit | NFR-10 | Partial | Image pushed (`6768341…`); no CI build job yet | Build job runs on merge to main and pushes an immutable tag |
| G-04 | Docker compose stack run end to end | Operations | Not started | No Docker daemon in the build sandbox | `docker compose up` brings up the database, migrations and app |
| G-05 | RDS certificate verification | NFR-12 | Not started | Certificate bundle not yet in the image | App connects with `sslmode=verify-full` |
| G-06 | Secret rotation procedure tested | NFR-12 | Not started | G-01 | Rotating the webhook secret and the database password works without downtime |
| G-07 | Monitoring, logs and alerts | NFR-08 | Not started | G-01 | Metrics in MONITORING.md §3 exist and an alert fires in a test |
| G-08 | Backup restore test | NFR-09, Gate 4 | Not started | G-01 | A restore to a new instance passes the ledger verifier (RES-03) |

## B. Discovery and normalisation (Phase 2)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-10 | Supported formats decided | FR-03 | Not started | OD-01 (owner decision) | OD-01 closed by ADR |
| G-11 | Parsers for each supported format | FR-03, FR-04 | Not started | G-10 | UT-001 to UT-005 pass on fixtures |
| G-12 | Malformed-input handling | FR-03.8, NFR-01 | Partial (JSON validity only) | G-11 | SEC-PARSE-01 and -02 pass |
| G-13 | Capability normalizer | FR-04 | Not started | G-11 | NORM-01 to NORM-04 pass; output matches the capability schema |
| G-14 | Path rename and deletion reconciliation | FR-03.6 | Not started | G-13 | GH-012, GH-013, DRIFT-06 pass |
| G-15 | Secret redaction in findings and logs | FR-03.9, NFR-12 | Not started | G-11 | SEC-RED-01 to -03 pass |
| G-16 | Repository scan history | FR-03.7 | Not started | Database | Each scan has a commit SHA and a row |

## C. Baselines, drift and policy (Phase 3 and 4)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-20 | Baseline versioning and approval | FR-05 | Not started | G-13 | BASE-01 to BASE-05 pass |
| G-21 | Drift engine | FR-06 | Not started | G-13, G-20 | UT-006 to UT-011 and DRIFT-04 to -06 pass on the benchmark corpus |
| G-22 | Core integration confirmed | DEP-01, ADR-0001 | Blocked | Core maintainers' answer on issue #782 (answer requested by 2026-12-09) | Core confirms the contract in writing |
| G-23 | Policy adapter to Core | FR-07 | Not started | G-22 | AUTH-001 to AUTH-007 pass against the Core contract |
| G-24 | Policy engine precedence rules | FR-07.3 | Not started | G-23; OD-13 (production access representation) | AUTH-005 passes |
| G-25 | Policy version and digest in each decision | AC-07.5 | Not started | G-23 | Each decision row stores the version and digest |

## D. Pull request pipeline (Phase 1 completion)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-30 | Worker that consumes the job queue | NFR-05, FR-08 | Not started | G-01 | A queued pull request job is processed end to end |
| G-31 | Fetch changed files at the head SHA | FR-08.4 | Not started | G-30; installation token wired to the worker | GitHub reads return the right files for a test PR |
| G-32 | Publish the real decision as a check | FR-08 | Partial (publisher built and tested; no real decision yet) | G-30, G-23 | Check conclusion matches the decision for each test PR |
| G-33 | Stale-result rule on real pull requests | GH-018 | Partial (rule in code; not exercised live) | G-32 | A superseded commit's result is not published |
| G-34 | Retry with backoff and dead-letter queue | NFR-05 | Not started | G-30 | PERF-005, PERF-006, PERF-009 pass |
| G-35 | End-to-end test on a real pull request | E2E-002 | Not started | G-02, G-32 | A pull request with an unauthorised change fails the check |

## E. Evidence (FR-10)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-40 | Evidence record table with hash chain | FR-10 | Not started | Database | CRY-007 and CRY-008 pass |
| G-41 | Signing through Core with tenant keys | FR-10, ADR-0001 | Not started | G-22; OD-05 (key custody) | CRY-001 and CRY-010 pass |
| G-42 | Evidence written before success is published | AC-10.6 | Partial (publisher refuses success without a flag; flag is not yet tied to real evidence) | G-40, G-41 | CRY-012 passes |
| G-43 | Export bundle | FR-10.7 | Not started | G-40 | CRY-011 passes |
| G-44 | Offline verifier | FR-10.5 | Not started | G-43 | E2E-007 passes with network disabled |
| G-45 | Key rotation with history | CRY-009 | Not started | G-41 | Historical evidence verifies after rotation |

## F. Approvals (FR-09, Phase 5)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-50 | Approval requests bound to commit, diff and policy version | FR-09.3 | Not started | G-23 | AUTH-013 passes |
| G-51 | Approval expiry and replay protection | FR-09.4, FR-09.5 | Not started | G-50 | AUTH-014 and AUTH-015 pass |
| G-52 | Separation of duties | FR-09.2 | Not started | G-50; OD-08 | AUTH-016 passes |
| G-53 | Approval invalidated by new commit | E2E-004 | Not started | G-50 | E2E-004 passes |

## G. Customer-facing product (Phase 6)

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-60 | User sign-in (GitHub OAuth, sessions) | FR-02, FR-11 | Not started | G-01 | Only members of the tenant can sign in |
| G-61 | Role-based access control | FR-02, RBAC-01, RBAC-02 | Not started | G-60 | Each role matches the permission matrix |
| G-62 | Dashboard (eleven sections) | FR-11 | Not started | G-60 | DASH-01 to DASH-05 pass |
| G-63 | Notifications | FR-12 | Not started | G-30 | NOT-01 to NOT-04 pass |
| G-64 | Audit history API and export | FR-13 | Partial (audit rows written; no read API) | G-60 | AUD-01 to AUD-03 pass |
| G-65 | Tenant deletion and suspension workflows | FR-13.8, TEN-011 | Not started | G-60; OD-06 | TEN-011 passes |
| G-66 | Accessibility review of the dashboard | NFR-11 | Not started | G-62 | ACC-01 passes |

## H. Security and assurance

| ID | Item | Serves | Status | Blocker / dependency | Done when |
| --- | --- | --- | --- | --- | --- |
| G-70 | Account security review closed with AWS | Security | Blocked | Reply on case 179520203500307 | AWS confirms the review is complete |
| G-71 | Tenant isolation suite (TEN-001 to TEN-012) on the deployed service | NFR-07 | Partial (database layer only) | G-01, G-60 | All TEN tests pass against the deployed service |
| G-72 | Security test plan executed | NFR-01 | Not started | G-01 | SEC-* tests run and high or critical findings are resolved |
| G-73 | Independent penetration test | NFR-01 | Not started | G-72 | Report received; no open critical or high findings |
| G-74 | Dependency and container scans in CI | NFR-01 | Partial (Dependabot for actions only) | None | Scan job runs on each pull request |
| G-75 | Root and IAM hygiene | Security | Partial (root key inactive; `parmana-kms-operator` locked; other keys under review) | Owners of `dip-*` and `cost-audit` keys | Credential report shows no unexpected active keys |
| G-76 | Plan entitlements table with RLS, written only by signed marketplace events | Pricing, NFR-07 | Not started | G-60, Owner confirms prices and caps | Plan changes are audited; unknown plan falls back to Pilot (ENT-001, ENT-004) |
| G-77 | Report-only mode and repository cap enforced in the check run | FR-14, Pricing | Not started | G-76, G-30 | ENT-002, ENT-003 pass; over-cap repository reports `neutral` naming the limit |
| G-78 | Downgrade applied at period end | Pricing | Not started | G-76 | ENT-005 passes |

## I. Open decisions that block the above

| Decision | Blocks | Owner |
| --- | --- | --- |
| OD-01 supported formats | G-10 | Owner |
| OD-05 signing key custody | G-41 | Owner |
| OD-06 retention periods | G-65 | Owner and counsel |
| OD-07 RPO and RTO | G-08 | Owner |
| OD-08 two-person approval default | G-52 | Owner |
| OD-13 production-access representation | G-24 | Owner |
| D2 Core contract confirmation (issue #782) | G-22 | Core maintainers |

## Order of work

1. Clear the AWS restriction (G-01, G-70). Everything customer-facing depends on it.
2. Confirm the Core contract (G-22), then build the policy adapter (G-23).
3. Build the worker and real pull request decisions (G-30 to G-35) and test them on the test repository.
4. Build evidence and verification (G-40 to G-45).
5. Build discovery and drift in parallel once formats are decided (G-10 to G-21).
6. Approvals, then the dashboard, notifications and sign-in (G-50 to G-66).
7. Security assurance before any customer (G-71 to G-73).
