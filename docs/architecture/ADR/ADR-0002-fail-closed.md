# ADR-0002: Fail closed on evaluation and evidence failures

Status: Accepted (2026-11-25, owner decision)
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

FR-07.5 requires failing closed on policy errors. AC-10.6 requires that failed evidence persistence cannot produce a successful enforcement check. Customers rely on the check as a control.

## Decision

| Condition | Check state published | Retry |
| --- | --- | --- |
| Authorized, evidence persisted | `success` | Not applicable |
| Approval required, no valid approval | `action_required` | On approval event |
| Denied | `failure` | On new commit or policy change |
| Policy missing, malformed, or evaluation error | `failure` with reason `policy_unavailable` | Automatic with backoff |
| Core timeout | `failure` with reason `evaluation_timeout` | Automatic with backoff |
| Evidence persistence failure | Not `success`; `failure` with reason `evidence_unavailable`, or `in_progress` with retry schedule | Automatic with backoff |
| Unparseable configuration | `failure` with reason `parse_error` for that path | On new commit |

The implementation may choose `in_progress` for transient infrastructure failures, provided no `success` is ever published while the evidence is missing. This choice is confirmed in the Phase 5 design review.

## Consequences

- Transient outages can block merges until retry succeeds. This is intended and is documented for customers.
- Operators must monitor evaluation backlog (`operations/MONITORING.md`).

## Tests or documents affected

AUTH-004, AUTH-007, CRY-012, E2E-006, GH-016, PERF-007.
