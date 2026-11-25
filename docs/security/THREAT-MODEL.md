# Threat Model

Document version: 1.0
Method: STRIDE per trust boundary (SYSTEM-ARCHITECTURE §5), with risk rated Likelihood × Impact on a 1–3 scale. Ratings are initial and must be reviewed in the Phase 0 design review.

## 1. Assets

| Asset | Why it matters |
| --- | --- |
| Tenant policies and baselines | Define organizational authority |
| Evidence ledger and signing keys | Basis of the proof claim |
| Installation tokens and App private key | Grant repository read and check write |
| Repository content (customer code and configs) | Confidential; untrusted as input |
| Approval records | Authorize exceptions |
| Audit log | Attribution of administrative actions |
| Customer PII (GitHub user IDs, names, emails) | Privacy obligations |

## 2. Adversaries

- **A1: Malicious repository contributor** who edits agent configuration to hide or expand authority.
- **A2: Malicious customer tenant** attempting cross-tenant access.
- **A3: External attacker** sending forged webhooks or probing the API.
- **A4: Compromised developer account** submitting PRs or approvals.
- **A5: Insider at the vendor** with database or KMS access.
- **A6: Supply-chain attacker** via dependencies or container images.

## 3. Threats and mitigations

| ID | Boundary | Threat | STRIDE | L | I | Mitigation | Verifying tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | B1 | Forged webhook triggers evaluation or tenant changes | S, T | 3 | 3 | HMAC verification, constant-time compare, delivery ID dedup | GH-006, GH-007, SEC-WH-01 |
| T-02 | B1 | Replay of a valid signed webhook | R | 2 | 2 | Delivery ID uniqueness; idempotent handling | GH-008, SEC-WH-02 |
| T-03 | B2 | Client-supplied tenant ID in API or job payload | E | 3 | 3 | Tenant derived from verified context; rejection on mismatch | TEN-005, TEN-006 |
| T-04 | B5 | Crafted YAML/JSON causing parser crash, resource exhaustion or prototype pollution | D, E | 3 | 2 | Data-only parsing, size and depth limits, safe JSON parsing without prototype merge, worker isolation | UT-004, SEC-PARSE-01, SEC-PARSE-02 |
| T-05 | B5 | Repository file path traversal or symlink escape when reading content | I, E | 2 | 3 | Content read only via API at SHA; no local filesystem access; symlinks not followed | SEC-PATH-01 |
| T-06 | B5 | Config instructs the scanner to fetch remote URLs (SSRF) | I | 2 | 3 | No outbound fetch of URLs from config content; egress allowlist for workers | SEC-SSRF-01 |
| T-07 | B5 | Agent config hides capability with unknown tool name | T | 3 | 3 | Unknown is never safe; unknown evaluates to deny by default | UT-012, AUTH-004 |
| T-08 | B5 | Evasion by splitting permissions across files or renames | T | 2 | 3 | Diff computed over all supported files at head SHA; renames reconciled by content digest | GH-012, DRIFT-06 |
| T-09 | B5 | Malicious PR sets check result via forged output | T | 1 | 2 | Checks published only by the App identity | SEC-CHK-01 |
| T-10 | B6 | Core unavailable or timing out, app defaults to allow | T, D | 2 | 3 | Fail closed (ADR-0002) | AUTH-007, E2E-006 |
| T-11 | B6 | Stale decision reused for new commit | T | 3 | 3 | Evaluation identity includes head SHA; stale results rejected | GH-018, AUTH-013, E2E-004 |
| T-12 | B7 | IDOR on evidence, policies, approvals | I, E | 3 | 3 | Object lookup scoped by tenant, 404 on mismatch, RBAC | TEN-002, TEN-004, SEC-IDOR-01 |
| T-13 | B7 | CSRF on administrative actions | T | 2 | 2 | CSRF tokens, SameSite cookies, no state change on GET | SEC-CSRF-01 |
| T-14 | B7 | Session fixation or stolen session | S | 2 | 3 | Session rotation on login, secure cookies, idle timeout | SEC-AUTH-01 |
| T-15 | B7 | Self-approval of restricted change | E | 3 | 3 | Separation of duties check against PR author | AUTH-016 |
| T-16 | B7 | Approval replay or approval for a different commit | R, T | 3 | 3 | Nonce single-use; approval bound to head SHA and diff hash | AUTH-013, AUTH-014, AUTH-015 |
| T-17 | B4 | Installation token leaked in logs or DB | I | 2 | 3 | Tokens memory-only; log redaction; secret scanning in CI | SEC-TOK-01, SEC-RED-01 |
| T-18 | B8 | Signing key misuse by another tenant | E | 1 | 3 | Per-tenant KMS key with key policy; resolution by tenant context | TEN-009, CRY-010 |
| T-19 | Ledger | Deletion, reordering or edit of evidence | T, R | 2 | 3 | Hash chain, signatures, immutable grants | CRY-003 to CRY-008 |
| T-20 | Ledger | Evidence gap hidden by retry | R | 2 | 3 | Sequence contiguity check; gap alert | CRY-007, RES-02 |
| T-21 | A5 | Vendor insider reads customer data | I | 2 | 3 | Least privilege, audited access, encryption at rest, no plaintext secrets | OPS-ACC-01 |
| T-22 | A6 | Vulnerable dependency or container | T, E | 3 | 2 | Dependency review, SBOM, container scanning, CodeQL | CI gates |
| T-23 | Dashboard | Sensitive config values displayed | I | 2 | 2 | Redaction in API and UI; no raw file rendering of secrets | SEC-RED-02 |
| T-24 | Notifications | Secret or cross-tenant content in notifications | I | 2 | 3 | Notification templates contain identifiers and links only | SEC-RED-03, TEN-* |
| T-25 | Evidence claim | Customer treats evidence as proof of runtime behavior | — (misuse) | 3 | 3 | Product language and dashboard labels: "declared", not "executed"; see SECURITY-BOUNDARIES | Documentation review DOC-01 |

## 4. Residual risks (accepted for Release 1.0, to be reviewed)

| ID | Residual risk | Reason accepted | Review |
| --- | --- | --- | --- |
| RR-01 | Agent behavior at runtime is not observed | Out of product scope (PRD §3.2) | Each release |
| RR-02 | A customer that does not configure branch protection can merge a failing PR | Customer responsibility (DEP-04) | Onboarding checklist |
| RR-03 | Declared configuration may omit capabilities the agent actually uses | Inherent limit of configuration discovery | Documented in product language |
| RR-04 | Vendor insider with combined DB and KMS access | Mitigated, not eliminated, by audit and least privilege | Pen test; OD-09 |

## 5. Security requirements derived from this model

1. Repository content is never executed, rendered as trusted HTML, or used as a URL to fetch.
2. Parsers enforce maximum file size, maximum nesting depth and maximum node count. Values are measured in Phase 2 and recorded in `testing/TEST-STRATEGY.md`.
3. Every authorization decision is bound to tenant, repository ID, PR number, head SHA, baseline version and policy version.
4. Every administrative action writes an audit event, including denied attempts for security-relevant operations.
5. Secrets never appear in logs, evidence, notifications, exports or the dashboard.

## 6. Review cadence

The threat model is reviewed at the Phase 0 exit, at each phase exit, and before each production release. Any new trust boundary (for example a new runtime integration) requires a new entry.
