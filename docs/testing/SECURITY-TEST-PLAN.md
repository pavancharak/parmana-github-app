# Security Test Plan

Document version: 1.0
Status: Plan. Assessments listed here have not been performed.

## 1. Mandatory assessments (before enterprise production release)

- OWASP ASVS-aligned application security testing.
- OWASP API Security Top 10 coverage.
- Webhook signature attacks.
- SSRF and malicious repository content testing.
- Path traversal and malicious configuration parser testing.
- Prototype pollution and unsafe deserialization.
- SQL injection.
- Broken object-level authorization.
- Cross-tenant access attacks.
- Replay attacks.
- Secret exposure.
- Dependency and supply-chain scanning.
- Container image scanning.
- Static analysis and dynamic application security testing.
- Penetration testing by an independent party before enterprise production release.

## 2. Repository content and webhook attacks

| ID | Attack | Method | Pass criteria | Threat |
| --- | --- | --- | --- | --- |
| SEC-WH-01 | Forged signature, altered body, missing header, wrong algorithm | Send crafted requests to `/webhooks/github` | All rejected with 401; no queue row | T-01 |
| SEC-WH-02 | Replay of captured valid delivery | Resend identical delivery and delivery ID | No second evaluation; response matches first | T-02 |
| SEC-PARSE-01 | Deeply nested JSON/YAML, billion-laughs YAML anchors, huge arrays | Fixtures in `tests/fixtures/malicious/` | Parser rejects over limits; worker stays healthy; memory bounded | T-04 |
| SEC-PARSE-02 | `__proto__`, `constructor.prototype` keys in JSON and YAML | Parse and merge attempt | No prototype change; key treated as data or rejected | T-04 |
| SEC-PATH-01 | Config path `../../etc/passwd`, absolute path, symlink in tree | Scanner input | Path rejected or ignored; no file outside tree read | T-05 |
| SEC-SSRF-01 | Config values containing `http://169.254.169.254/` or internal hosts | Scanner and normalizer run | No outbound request is made from parsing; egress restricted | T-06 |
| SEC-CHK-01 | Forged check output via PR text or comment | Attempt to influence check result | Check result derived only from evaluation; text is not parsed as instruction | T-09 |
| SEC-SCRIPT-01 | Config containing script or command strings | Parse and evaluate | Never executed; shown as data | INV-5 |

## 3. Secrets and redaction

| ID | Test | Pass criteria |
| --- | --- | --- |
| SEC-TOK-01 | Scan DB tables, cache snapshots, logs and queue payloads after a full evaluation run, looking for installation token prefixes | No match |
| SEC-RED-01 | Config containing secret-looking values (`ghp_`, `AKIA`, `-----BEGIN`) | Values replaced with `[REDACTED:<type>]` in findings, logs and evidence |
| SEC-RED-02 | Dashboard and API responses for config-derived data | No raw secret values returned |
| SEC-RED-03 | Notification bodies and email/webhook payloads | Contain identifiers and links only |
| SEC-KEY-01 | Search for private key material in container image, logs and repository | None found |

## 4. Application and access control

| ID | Test | Pass criteria | Threat |
| --- | --- | --- | --- |
| SEC-IDOR-01 | Iterate object IDs across tenants for every `GET /v1/*` resource | 404 for other tenant objects; no enumeration signal | T-12 |
| SEC-CSRF-01 | Cross-origin POST to administrative endpoints with a valid session | Rejected without CSRF token | T-13 |
| SEC-AUTH-01 | Session fixation, reuse after logout, expired session | Rejected; new session ID on login | T-14 |
| SEC-AUTH-02 | Role escalation attempts by Developer and Auditor roles | Each denied per PERMISSION-MATRIX | RBAC |
| SEC-INJ-01 | SQL injection in every filter and sort parameter | Parameterized; no error leakage | — |
| SEC-HDR-01 | Security headers on dashboard (CSP, HSTS, X-Content-Type-Options, frame-ancestors) | Present and strict | — |
| SEC-ERR-01 | Error responses on malformed input | No stack traces or internal identifiers | — |
| SEC-RATE-01 | Brute force on OAuth callback and API | Rate limits apply | — |

## 5. Supply chain and build

- Dependency review on every PR (blocks high-severity new vulnerabilities).
- `npm audit` or equivalent in CI with documented exceptions.
- SBOM generated per release (SPDX or CycloneDX).
- Container images scanned; base images pinned by digest.
- Lockfile required; CI fails on lockfile drift.
- GitHub Actions pinned to commit SHA.

## 6. Ledger and evidence security

| ID | Test | Pass criteria |
| --- | --- | --- |
| RES-01 | Restart service during write; verify ledger after restart | Chain verifies; no gaps; no duplicates |
| RES-02 | Simulate gap in sequence (database admin delete) | Verifier and monitoring detect it (CRY-007) |
| RES-03 | Restore from backup into clean environment; verify ledger | Ledger verifies; sequence range matches manifest |
| SEC-KMS-01 | Revoke KMS grant for tenant key | Signing fails; no success published (PERF-007) |
| SEC-KEY-02 | Simulated key compromise drill | Rotation and revocation procedure completed per INCIDENT-RESPONSE |

## 7. Tenant isolation attacks

Derived from `TEN-*` in `TEST-CASES.md` and expanded here:

- Cache poisoning across tenants via shared key namespace.
- Job queue confusion: re-enqueue job for tenant B with tenant A payload.
- Export bundle containing another tenant's evidence through shared object store paths.
- RLS bypass attempts through `SET app.tenant_id` changes from application code (must be impossible through the application role).

## 8. Penetration test scope

- External: API, dashboard, OAuth flow, webhook endpoint.
- Authenticated: two tenants, each with owner, auditor and developer accounts.
- Repository-content: crafted repositories containing malicious configurations.
- Infrastructure: review of IAM, network policies, KMS key policies (configuration review, not active testing of cloud control plane without authorization).

Findings are classified by severity. **Critical and high findings block release** (NFR-01).

## 9. Vulnerability handling

| Severity | Release impact | Fix target |
| --- | --- | --- |
| Critical | Blocks release | Immediate; hotfix path |
| High | Blocks release | Before release |
| Medium | Does not block; tracked | Next release |
| Low | Does not block | Backlog |

Coordinated disclosure policy and security contact are required before public launch (TBD).
