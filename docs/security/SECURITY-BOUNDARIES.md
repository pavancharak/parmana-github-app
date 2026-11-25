# Security Boundaries and Invariants

Document version: 1.0
This document states what the Product guarantees, what it does not, and the invariants that release gates test.

## 1. Guarantee statement

Parmana **detects changes to declared agent capabilities, evaluates them against organizational authority, and enforces the resulting decision at configured GitHub control points**, and **produces evidence of those evaluations** that can be verified offline.

## 2. Non-claims (must appear in customer-facing material)

Parmana does **not** claim that:

1. Scanning repository files proves what an agent executed.
2. Declared capabilities equal runtime capabilities.
3. An agent that is not configured in a supported format is governed.
4. Evidence proves that an unobserved action did or did not occur.
5. Merges are prevented unless the customer requires the Check Run in branch protection or rulesets.
6. Parmana replaces IAM, branch protection or endpoint security.

Terminology in UI and API:

| Use | Avoid |
| --- | --- |
| "declared capability" | "agent permission" when describing runtime |
| "authorized by policy" | "safe" |
| "evaluated at commit SHA" | "approved agent" |
| "unknown capability (not evaluated as safe)" | "unrecognized, ignored" |

## 3. Four invariants

Release gate 3 and the security suite test these.

| ID | Invariant | Test |
| --- | --- | --- |
| INV-1 | **No tenant context, no access.** Every data access path requires a verified tenant context. | TEN-*, lint rule, RLS test TEN-012 |
| INV-2 | **No valid authorization, no successful enforcement check.** A `success` Check Run requires a Core `allow` decision bound to the head SHA and a persisted evidence record. | GH-017, AUTH-*, CRY-012, E2E-001 |
| INV-3 | **No verifiable evidence, no claim of completed proof.** The dashboard and API describe an evaluation as proven only when its evidence verifies. | CRY-*, E2E-007, DASH-04 |
| INV-4 | **Unknown is not safe.** Unknown capabilities never match an allow rule without an explicit rule. | UT-012, AUTH-004, AC-04.2 |
| INV-5 | **Repository content is data.** No repository file is executed, evaluated as a template, or used as a fetch target. | SEC-PARSE-*, SEC-SSRF-01 |
| INV-6 | **Decisions are commit-bound.** Approval and check state for commit A never apply to commit B. | AUTH-013, E2E-004, GH-018 |
| INV-7 | **Secrets stay out.** Secret values never appear in logs, evidence, notifications, exports, dashboards or error responses. | SEC-RED-01 to 03, AC-01.5 |
| INV-8 | **Historical decisions are immutable.** Policy and baseline changes do not alter past decisions or evidence. | AUTH-006, BASE-05, CRY-004 |

## 4. Out-of-scope boundaries

| Area | Boundary |
| --- | --- |
| Runtime control | The Product does not intercept agent processes, shell commands or network calls. |
| Repository writes | The App does not push commits, merge PRs or edit branch protection. |
| Model behavior | The Product does not evaluate model outputs. |
| Identity provider | Organizational SSO and MFA are inherited from GitHub OAuth and the customer's GitHub settings. |
| Core internals | Cryptographic primitives and policy semantics are owned by Parmana Core. |

## 5. Data handling boundaries

- **Collected:** installation and repository identifiers, file paths, content digests, capability records with source pointers, decisions, approvals, audit events, GitHub user identifiers of approvers and PR authors.
- **Not collected:** repository file contents beyond the parsed fields needed for capability extraction (kept only in memory during evaluation); secret values; full diffs of non-configuration files.
- **Retention:** per tenant (OD-06).

## 6. Trust boundaries and controls

See `architecture/SYSTEM-ARCHITECTURE.md` §5 (B1–B8). Each boundary's control is tested in `testing/SECURITY-TEST-PLAN.md`.

## 7. Change control for this document

Changes to invariants require owner approval and an ADR. Changes to non-claims require product and legal review before publication.
