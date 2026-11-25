# API Contracts

Document version: 1.0
Status: Contract draft for Phase 0. Final OpenAPI documents are generated from this list and stored in `docs/api/openapi/` before Phase 1 exit.

## 1. Versioning

- External REST API is under `/v1/`. Breaking changes require `/v2/` and a deprecation period of at least 90 days (TBD, OD-09 adjacent).
- Every response includes `api_version` and the schema version of the returned payloads.
- Errors use one shape:

```json
{ "error": { "code": "tenant_not_found", "message": "Human readable text without secrets", "request_id": "req_..." } }
```

## 2. Authentication

| Caller | Mechanism |
| --- | --- |
| Browser user | GitHub OAuth, server-side session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`), CSRF token on mutating requests |
| GitHub | Webhook HMAC signature |
| Internal worker | Service identity, not user-facing; tenant context from job payload |

Tenant identity is never accepted as a request field. The tenant is determined by the session's membership or the installation resolved from the webhook. Requests containing a `tenant_id` in body or query are rejected when it does not match the verified context (TEN-005).

## 3. Endpoints

| Method | Path | Role minimum | Purpose | Notes |
| --- | --- | --- | --- | --- |
| GET | `/v1/me` | Any member | Current user and tenant memberships | |
| GET | `/v1/installations` | Engineering Admin | List installations for tenant | |
| GET | `/v1/repositories` | Auditor | Repository inventory | Filters: `status`, `installation_id` |
| GET | `/v1/repositories/{repositoryId}/agents` | Auditor | Agents discovered in repository | |
| GET | `/v1/agents` | Auditor | Agent inventory | Filters: `repository`, `agent_key` |
| GET | `/v1/agents/{agentId}` | Auditor | Agent detail with capabilities and source references | No secret values |
| GET | `/v1/baselines` | Auditor | Baseline list | |
| POST | `/v1/baselines/{baselineId}/versions` | Security Admin | Propose baseline version | Creates draft; not active |
| POST | `/v1/baselines/{baselineId}/versions/{version}/approve` | Security Admin, approver group | Approve and activate | Requires separation of duties (FR-09) |
| POST | `/v1/baselines/{baselineId}/rollback` | Security Admin | Activate earlier version as new version | Creates audit event |
| GET | `/v1/policies` | Auditor | Policy list | |
| POST | `/v1/policies/{policyId}/versions` | Security Admin | Propose policy version | Validated against POLICY-SCHEMA |
| POST | `/v1/policies/{policyId}/versions/{version}/publish` | Security Admin (two-person if OD-08 requires) | Publish | Immutable after publish |
| GET | `/v1/evaluations` | Auditor | PR evaluations | Filters: `repository`, `decision`, `from`, `to` |
| GET | `/v1/evaluations/{evaluationId}` | Auditor | Evaluation detail with drift findings | |
| GET | `/v1/drift-findings` | Auditor | Drift findings | Filters: `severity`, `drift_type`, `repository` |
| GET | `/v1/approvals` | Approver | Pending and historical approval requests | |
| POST | `/v1/approval-requests/{requestId}/decisions` | Approver | Approve or reject | Body: `decision`, `reason`, `nonce`. Bound to evaluation and head SHA |
| GET | `/v1/evidence` | Auditor | Evidence list | Cursor pagination |
| GET | `/v1/evidence/{evidenceId}` | Auditor | Evidence record and verification status | |
| POST | `/v1/evidence/exports` | Auditor | Create export bundle | Tenant-scoped; recorded in audit |
| GET | `/v1/evidence/exports/{exportId}` | Auditor | Download status and signed URL | Expiring URL |
| GET | `/v1/audit-events` | Auditor (read), Security Admin | Audit history | Read-only |
| GET | `/v1/notifications` | Any member | Own notifications | |
| PATCH | `/v1/notification-preferences` | Any member | Own preferences | |
| GET | `/v1/settings` | Owner, Security Admin | Organization settings | |
| PATCH | `/v1/settings` | Owner | Update settings | Audit event |
| POST | `/v1/tenant/suspension` | Owner | Suspend tenant | Audit event |
| POST | `/v1/tenant/deletion-requests` | Owner | Request deletion | Requires confirmation step and retention checks |

## 4. Webhook endpoints

| Method | Path | Source | Response |
| --- | --- | --- | --- |
| POST | `/webhooks/github` | GitHub | `202` after durable enqueue; `401` on signature failure; `400` on malformed envelope |

## 5. Internal service contracts

### 5.1 Policy adapter → Parmana Core

Request (HTTPS with JSON bodies over mutual TLS to the Core service, per ADR-0001 item 5):

```json
{
  "contract_version": "1.0",
  "tenant_id": "uuid",
  "repository_id": 123456,
  "pr_number": 42,
  "head_sha": "40-hex",
  "base_sha": "40-hex",
  "baseline_version_id": "uuid",
  "policy_version_id": "uuid",
  "policy_digest": "sha256:...",
  "capability_diff": [],
  "approval_refs": []
}
```

Response:

```json
{
  "contract_version": "1.0",
  "decision": "allow | deny | approval_required | failure",
  "reasons": [{ "code": "string", "drift_key": "string" }],
  "evaluation_digest": "sha256:...",
  "evaluated_at": "RFC3339"
}
```

Rules: `failure` is returned by the adapter (not Core) for timeouts and unavailable Core. Any response that is not valid against this contract is treated as `failure`.

### 5.2 Evidence adapter → Core signing

Input: canonical evidence payload per `EVIDENCE-SCHEMA.md`. Output: signature, key ID, sequence number. Failure aborts the evaluation's final state (ADR-0002).

## 6. Pagination, filtering and sorting

- Cursor pagination on all list endpoints. Page size default 25, maximum 100.
- Sorting is by `created_at` descending, then `id`, to keep order deterministic.
- Date filters use RFC3339 with explicit time zone.

## 7. Rate limiting

API requests are limited per session and per tenant. Limits are TBD and recorded in `operations/MONITORING.md`. Limit responses use `429` with `retry-after`.

## 8. Idempotency

Mutating endpoints accept `Idempotency-Key`. A repeated key with the same body returns the original response. A repeated key with a different body returns `409`.
