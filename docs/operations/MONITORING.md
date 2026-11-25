# Monitoring, Logging, Tracing and Alerting

Document version: 1.0
Status: Proposed. Thresholds are initial and are tuned in staging. No thresholds here are measured results.

## 1. Principles

- Structured logs (JSON), one event per line, with `tenant_id`, `installation_id`, `delivery_id`, `request_id` where applicable.
- **No secret values, tokens, private keys, or raw repository content in logs.** Enforced by a redaction filter and tested (SEC-TOK-01, SEC-RED-01).
- Metrics carry tenant identity as a label only where cardinality is bounded (tenant count is tracked in aggregate; per-tenant metrics are limited to an allowlist).
- Traces propagate W3C trace context from webhook receipt to Check Run publication.

## 2. Service level objectives

| SLO | Objective (initial target) | Measurement |
| --- | --- | --- |
| Availability of webhook acceptance | 99.9% monthly | Ratio of 2xx to valid signed requests |
| Webhook acknowledgement | p95 under 10 s, with durable enqueue | Receipt to commit |
| Evaluation latency (policy only) | p95 under 500 ms (NFR-03) | Core call start to decision return, excluding GitHub |
| Evaluation completion | 99% of PR events evaluated within the defined window (TBD) | Event receipt to Check Run |
| Evidence integrity | 100% of records verify in the scheduled verifier | Verifier job |
| No silent loss | 0 accepted deliveries without a terminal state | Reconciliation job |

Error budgets are tracked per SLO. Budget exhaustion freezes non-urgent feature releases.

## 3. Metrics

| Metric | Type | Labels | Alert |
| --- | --- | --- | --- |
| `webhook_received_total` | counter | event, outcome | Sudden drop to zero during business hours |
| `webhook_signature_failures_total` | counter | none | Spike > baseline × 5 for 10 minutes |
| `webhook_queue_depth` | gauge | none | Above threshold for 15 minutes |
| `webhook_processing_latency_seconds` | histogram | event | p95 above target |
| `evaluation_total` | counter | decision | Ratio of `failure` above threshold |
| `evaluation_duration_seconds` | histogram | stage | p95 above 500 ms for policy stage |
| `core_request_total` | counter | outcome | Error ratio above threshold |
| `core_timeout_total` | counter | none | Any sustained increase |
| `github_api_requests_total` | counter | status | 403 or 429 spike |
| `github_rate_limit_remaining` | gauge | installation (aggregated) | Below 10% of limit |
| `dead_letter_total` | counter | job_type | Any increase |
| `evidence_append_failures_total` | counter | reason | Any non-zero value pages on-call |
| `evidence_sequence_gap_detected_total` | counter | none | Any non-zero value pages on-call |
| `kms_sign_failures_total` | counter | none | Any non-zero value pages on-call |
| `auth_denied_total` | counter | reason | Spike in tenant-scope rejections |
| `cross_tenant_reject_total` | counter | surface | Any non-zero value creates a security alert |

## 4. Logs

Required fields on every event: `timestamp` (RFC 3339 UTC), `level`, `service`, `version`, `event`, `trace_id`.

Security events (always logged, retained longer than application logs):

- Webhook signature failure (source IP, delivery ID if present).
- Tenant-scope rejection (actor, object type, requested tenant, verified tenant).
- Approval rejection (replay, expiry, wrong commit, self-approval).
- Administrative actions (also written to `audit_events`).

Logs never include: request bodies of webhooks, file content, tokens, cookies, approval nonces.

## 5. Traces

Spans: webhook receive → verify → enqueue → worker job → fetch files → parse → normalize → drift → Core call → evidence sign → persist → check publish. Span attributes contain tenant ID and commit SHA, not content.

## 6. Integrity monitoring

- **Scheduled verifier** runs every hour per tenant over new evidence records and daily over full ledgers. Failure pages on-call.
- **Reconciliation job** compares accepted deliveries, queue rows and evaluations. Mismatch creates an incident-class alert.
- **Check consistency job** compares Check Runs published on GitHub with stored decisions for a sample of PRs.

## 7. Dashboards

Operational dashboards (Phase 7): webhook pipeline, evaluation pipeline, Core dependency, GitHub API health, ledger integrity, tenant-scoped error rates (aggregated), cost.

## 8. Alert routing

| Severity | Example | Route | Response target |
| --- | --- | --- | --- |
| SEV-1 | Cross-tenant access detected; evidence signing failure; ledger gap | Page on-call and security | 15 minutes |
| SEV-2 | Evaluation backlog above threshold; Core error ratio high | Page on-call | 30 minutes |
| SEV-3 | Single installation rate-limited; dead-letter increase | Ticket | Next business day |

Severity definitions are in `operations/INCIDENT-RESPONSE.md`.

## 9. Access to operational data

- Vendor operators access customer data only through audited tooling. Access events are logged (OPS-ACC-01, threat T-21).
- Dashboards show aggregated data by default.
