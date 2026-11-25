# Test Strategy

Document version: 1.0
Status: Proposed for Phase 0 approval.

## 1. Principles

1. **Test the lifecycle, not only endpoints.** A passing API response is not evidence of enforcement. Acceptance is proven by E2E scenarios.
2. **Release-blocking suites are named and gated.** Tenant isolation, cryptographic evidence and enforcement correctness cannot be waived for a release.
3. **Fixtures are the specification.** Parser and drift behavior is defined by checked-in fixtures and their expected canonical outputs.
4. **Recorded results are real.** A result is written to the results log only when it was produced by a run. Unrun tests are recorded as *not run* with a reason.
5. **Determinism is tested.** Identical input must produce identical output across runs and processes.

## 2. Test levels

| Level | Location | Scope | Runs |
| --- | --- | --- | --- |
| Unit | `tests/unit` | Parsers, normalizer, drift, policy evaluator, schema validation | Every PR |
| Integration | `tests/integration` | Services with real PostgreSQL, queue and a Core test double; evidence chain | Every PR |
| GitHub | `tests/github` | GitHub API behavior against recorded fixtures and a sandbox organization | Every PR (fixtures); nightly (sandbox) |
| Isolation | `tests/isolation` | Cross-tenant tests, RLS, cache and queue isolation | Every PR; release blocking |
| Security | `tests/security` | Attack suites from `SECURITY-TEST-PLAN.md` | Every PR (fast subset); nightly (full) |
| E2E | `tests/e2e` | Journeys in `E2E-SCENARIOS.md` on staging | Every release candidate; nightly |
| Resilience | `tests/resilience` | Failure injection: DB, queue, KMS, Core, GitHub | Nightly; pre-release |
| Performance | `tests/perf` | Load profiles PERF-001 to PERF-010 | Pre-release; weekly |

## 3. Tooling

| Need | Tool |
| --- | --- |
| Unit and integration | Vitest |
| Browser E2E | Playwright |
| API contract | OpenAPI validation against `API-CONTRACTS.md` |
| Property tests for normalization | fast-check (recommended; confirm in Phase 2) |
| Load | k6 or Artillery (decide in Phase 7) |
| Container services in CI | Docker Compose with PostgreSQL and Redis (if ADR-0004 selects Redis) |
| Secret scanning | GitHub secret scanning and a repository scanner in CI |
| SAST | CodeQL |
| Dependency review | GitHub dependency review |

## 4. Required CI checks

Every pull request must pass, in this order:

```
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:security        # fast subset
npm run test:isolation       # release blocking
npm run test:e2e             # on release branches and nightly; smoke subset on PRs
npm run build
npm run evaluate             # evidence integrity evaluation on release branches
```

Additional workflows: CodeQL (PR and scheduled), dependency review (PR), secret scanning (PR), container scanning (release), SBOM generation (release), deployment verification (deployment), evidence integrity evaluation (release).

A lint rule enforces `TenantContext` parameters on tenant-scoped service methods (ADR-0003).

## 5. Evaluation and reporting

- `npm run evaluate` runs the drift benchmark, the policy determinism check (same input, 100 repetitions), and the evidence chain verifier over a generated ledger.
- Output follows `testing/templates/` in the parmana-core repository's conventions when those templates are adopted. Until then, results are written to `docs/testing/results/` with one file per run: commit SHA, runner, command, runtime, pass/fail per test ID, and a list of tests not run with reason.
- Results are appended, never rewritten. Corrections are dated notes.

## 6. Performance test profiles

| ID | Profile | Target acceptance | Data needed |
| --- | --- | --- | --- |
| PERF-001 | 100 concurrent PR evaluations | No incorrect decisions (compared with oracle) | Fixture PR set |
| PERF-002 | 500 concurrent webhook deliveries | No event loss; ack p95 within 10 s | Synthetic signed deliveries |
| PERF-003 | Large repository with many files | Bounded memory and execution | Generated repo with N files; N set in Phase 2 |
| PERF-004 | Repeated webhook retries | Idempotent processing | Replayed deliveries |
| PERF-005 | Database connection interruption | Safe recovery | Fault injection |
| PERF-006 | Queue worker crash | Job recovered | Process kill |
| PERF-007 | KMS unavailable | Signing fails safely | Fault injection |
| PERF-008 | Large evidence export | Streaming or bounded resource usage | 1M-record ledger |
| PERF-009 | GitHub rate limiting | Retry without data loss | Mock API returning 403/429 |
| PERF-010 | Sustained workload | Meets agreed latency and error targets (NFR-02, NFR-03) | Load profile TBD |

NFR-03 (policy evaluation p95 under 500 ms excluding GitHub calls) is measured by `PERF-001` and `PERF-010`. Numbers are not claimed until measured.

## 7. Entry and exit criteria per phase

| Phase | Test suites required to exit |
| --- | --- |
| 0 | Test strategy approved; traceability matrix complete; fixture plan exists |
| 1 | `GH-*` for installation and webhook; `test:unit` and `test:integration` green; GH-006 to GH-008 pass |
| 2 | All supported fixture tests (`UT-001` to `UT-005`, `DIS-*`) pass; SEC-PARSE-* pass; deterministic NORM-* pass |
| 3 | Benchmark drift suite (UT-006 to UT-011, DRIFT-*) passes; BASE-* pass |
| 4 | AUTH-* and CRY-* pass; policy determinism check; offline verification passes |
| 5 | E2E-002, E2E-003, E2E-004, E2E-006 pass; GH-017, GH-018 pass |
| 6 | E2E-001, E2E-005; TEN-* all pass; RBAC-* pass; DASH-* pass |
| 7 | All suites; PERF-*; RES-*; SEC-* full; E2E-007; disaster recovery test |

## 8. Test data and secrets

- No production data is used in tests.
- Sandbox organization credentials are stored in CI secret storage, never in fixtures.
- Test App private key is separate from production and rotated on a schedule.

## 9. Flakiness policy

- A test that fails intermittently is quarantined only with an owner and a deadline of five working days. Quarantine never applies to `TEN-*`, `CRY-*` or `E2E-002`, `E2E-005`, which must be fixed.
- Retries are not used to convert a failure into a pass.
