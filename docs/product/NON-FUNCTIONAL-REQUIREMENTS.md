# Non-Functional Requirements

Document version: 1.0
These are mandatory release requirements, not optional improvements. Targets are engineering requirements. None has been measured yet.

| ID | Requirement | Acceptance criteria | Verified by |
| --- | --- | --- | --- |
| NFR-01 | Security | No unresolved critical or high-severity release-blocking vulnerabilities | `testing/SECURITY-TEST-PLAN.md` |
| NFR-02 | Availability | Initial target 99.9% monthly for hosted service | `operations/MONITORING.md` (SLO), `PERF-010` |
| NFR-03 | Performance | 95th percentile policy evaluation under 500 ms, excluding external GitHub calls | `PERF-001`, `PERF-010` |
| NFR-04 | Scalability | Horizontal scaling of webhook workers | `PERF-002` |
| NFR-05 | Reliability | Durable event processing and retries | `GH-016`, `PERF-005`, `PERF-006` |
| NFR-06 | Integrity | Cryptographic verification of all signed evidence | `CRY-001` to `CRY-012` |
| NFR-07 | Isolation | Zero unauthorized cross-tenant access | `TEN-001` to `TEN-012`, `E2E-005` |
| NFR-08 | Observability | Structured logs, metrics, traces and alerting | `operations/MONITORING.md` |
| NFR-09 | Recovery | Tested backup restoration and disaster recovery | `operations/BACKUP-RECOVERY.md` |
| NFR-10 | Compatibility | Versioned schemas and API contracts | `api/*` version rules |
| NFR-11 | Accessibility | Dashboard usable with keyboard and screen readers | Dashboard accessibility test (to be added in Phase 6) |
| NFR-12 | Privacy | Data minimization, secret redaction and retention controls | `security/SECURITY-BOUNDARIES.md`, `TEN-011` |

## Operational targets

| Target | Requirement |
| --- | --- |
| Webhook acknowledgement | Within 10 seconds, with durable queuing **before** acknowledgement |
| Event loss | No loss of accepted webhook events |
| Retry | Bounded exponential backoff with jitter |
| Dead letter | Dead-letter queue for exhausted retries |
| Secrets in logs | No secrets or private keys in logs |
| Recovery objectives | Documented RPO and RTO before production release (see `operations/BACKUP-RECOVERY.md`; values TBD, OD-07) |

## Latency and throughput definitions

- **Policy evaluation latency** is measured from the moment the evaluator receives a normalized capability set to the moment it returns a decision. It excludes GitHub API calls and includes evidence construction up to, but not including, the durable append.
- **Webhook acknowledgement** is measured from receipt of a signed request to the durable queue commit.
- Percentile targets are evaluated over a named load profile defined in `testing/TEST-STRATEGY.md`.

## Non-goals for NFRs

- Compliance certifications (SOC 2, ISO 27001) are not Release 1.0 requirements. They are tracked as OD-09.
- Multi-region active-active operation is not required for Release 1.0.
