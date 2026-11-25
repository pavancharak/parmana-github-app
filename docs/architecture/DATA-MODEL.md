# Data Model

Document version: 1.0
Status: Proposed. Column-level DDL is produced in Phase 0 from this document and lives in `database/schema/`.

## 1. Rules that apply to every table

1. **Tenant association.** Every business table has a non-null `tenant_id`.
2. **Composite keys.** Child tables reference parents with `(tenant_id, id)`, so a foreign key cannot point across tenants.
3. **Immutability.** Published `capability_baseline_versions`, `policy_versions`, `evidence_records` and `audit_events` are append-only. Application roles have no `UPDATE` or `DELETE` on them.
4. **Timestamps.** Trusted event time comes from the server clock at receipt, plus the GitHub event time recorded separately.
5. **No secrets.** Tokens, private keys and secret values are never stored in these tables. Installation tokens are short-lived and held in memory only.
6. **Versioned schemas.** Every JSON payload column carries a `schema_version`.

## 2. Entities

| Entity | Purpose | Key | Notes |
| --- | --- | --- | --- |
| `tenants` | Organization workspace | `id` (UUID) | Unique on `github_org_id`; see OD-02 |
| `github_installations` | Installation identity and lifecycle | `id`; unique `github_installation_id` | Status: `active`, `suspended`, `removed` |
| `installation_events` | Lifecycle history | `(tenant_id, id)` | Append-only |
| `repositories` | Connected repository | `(tenant_id, id)`; unique `(tenant_id, github_repo_id)` | Stores immutable GitHub repo ID, not only name |
| `users` | Workspace user | `id`; unique `github_user_id` | |
| `memberships` | Role in tenant | `(tenant_id, user_id)` unique | Role enum; revoked by `revoked_at` |
| `agents` | Discovered agent identity | `(tenant_id, id)`; unique `(tenant_id, repository_id, agent_key)` | `agent_key` is a deterministic slug from source |
| `agent_configurations` | Configuration snapshot per commit and path | `(tenant_id, id)`; unique `(tenant_id, repository_id, commit_sha, path)` | Holds `content_digest`, `parser_version` |
| `capabilities` | Normalized capability record | `(tenant_id, id)` | Holds `provenance` = declared / inferred / unknown |
| `scans` | Repository scan history | `(tenant_id, id)` | Links to `commit_sha` |
| `capability_baselines` | Baseline container | `(tenant_id, id)` | Holds `active_version_id` |
| `capability_baseline_versions` | Immutable approved baseline | `(tenant_id, baseline_id, version)` | Contains canonical JSON and digest |
| `policies` | Policy container | `(tenant_id, id)` | |
| `policy_versions` | Immutable policy | `(tenant_id, policy_id, version)` | Contains canonical JSON, digest, author, approval |
| `drift_findings` | Permission difference | `(tenant_id, id)`; unique `(tenant_id, evaluation_id, drift_key)` | `drift_key` is stable hash |
| `pull_request_evaluations` | PR evaluation | `(tenant_id, id)`; unique `(tenant_id, repository_id, pr_number, head_sha, policy_version_id)` | Unique evaluation identity for commit and policy version |
| `approval_requests` | Approval workflow | `(tenant_id, id)` | Bound to `evaluation_id` and diff hash |
| `approvals` | Signed approval | `(tenant_id, id)`; unique `(tenant_id, request_id, approver_id)` | Single-use nonce |
| `evidence_records` | Signed decision evidence | `(tenant_id, id)`; unique `(tenant_id, sequence)` | Hash chain per tenant |
| `evidence_keys` | Public verification keys | `(tenant_id, key_id)` | Versioned; rotated keys retained |
| `audit_events` | Administrative activity | `(tenant_id, id)` | Append-only |
| `webhook_events` | Processing and dedup | unique `delivery_id` (GitHub `X-GitHub-Delivery`) | Status and attempt count |
| `notifications` | Delivery tracking | `(tenant_id, id)`; unique `dedup_key` | |

## 3. Key relationships

```
tenants 1─* github_installations 1─* repositories 1─* agent_configurations *─1 scans
                                        │
                                        └─* pull_request_evaluations *─1 policy_versions
                                                     │                    │
                                                     │                    └─ policies 1─* policy_versions
                                                     ├─* drift_findings
                                                     ├─0..1 approval_requests 1─* approvals
                                                     └─1 evidence_records (sequence per tenant)

capability_baselines 1─* capability_baseline_versions
```

## 4. Constraints required before Phase 1

| Constraint | Type | Purpose |
| --- | --- | --- |
| Unique `github_installations.github_installation_id` | Unique | Exactly one tenant per installation (AC-01.1) |
| Unique `webhook_events.delivery_id` | Unique | Idempotent webhook handling (GH-008) |
| Unique `pull_request_evaluations(tenant, repo, pr, head_sha, policy_version)` | Unique | No duplicate decisions (AC-08.5) |
| Unique `evidence_records(tenant, sequence)` | Unique | Ordered, gap-detectable ledger |
| Composite FKs on all child tables | Foreign key | Tenant consistency (TEN-*) |
| Trigger or revoked grants on published versions | Immutability | AC-05.3, AC-07.6 |
| `CHECK` on decision enum | Check | Only `allow`, `deny`, `approval_required`, `failure` |
| `CHECK` on provenance enum | Check | Unknown stays unknown (AC-04.2) |
| Row-level security on tenant tables, keyed by `current_setting('app.tenant_id')` | RLS | Defense in depth (TEN-012) |
| Separate migration role | Role | Privileged DDL separated from application role |

## 5. Retention

Retention is per tenant (FR-02, NFR-12). Defaults are TBD pending OD-06. Evidence records and audit events are retained for the period in the tenant's retention setting, and deletion is performed only by the tenant deletion workflow (FR-13.8), which writes its own audit event before deletion.

## 6. Evolution

- Adding a nullable column is a minor change.
- Renaming or removing a column, or changing an enum meaning, is a major change and requires an ADR.
- Migrations are forward-only. Rollback is by deploying the previous application version against a backward-compatible schema.
