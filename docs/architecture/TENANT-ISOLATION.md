# Tenant Isolation

Document version: 1.0
Status: Release-blocking design. Every requirement here maps to a `TEN-*` test in `testing/TEST-CASES.md`.

## 1. Invariant

> A valid GitHub installation must never grant access to another organization's policies, evidence, repositories or credentials.

Violation of this invariant is a release-blocking defect (PRD §7, NFR-07).

## 2. Tenant identity

- Tenant identity is **derived** from the verified GitHub installation, never from client input (AC-02.2).
- The tenant record is created once per GitHub installation ID (AC-01.1).
- Whether the internal tenant key is a UUID mapped to the GitHub organization ID or the organization ID itself is decided in OD-02. Recommendation: internal UUID with a unique mapping, so that an organization that is re-installed or renamed does not change Parmana identity.

## 3. Tenant context object

Every application service receives a `TenantContext` value. It is the only way to address tenant data.

```
TenantContext {
  tenantId: UUID
  installationId: bigint        // GitHub installation, verified
  actor: { type: 'user' | 'app' | 'job', id: string, role?: Role }
  originatingJobId?: string     // set for background work (AC-02.6)
  policyScope: 'read' | 'write' | 'admin'
}
```

Rules:

1. Constructed only by the integration layer, authentication middleware or the job runner, from verified inputs.
2. Passed explicitly. No global or thread-local tenant variable.
3. A service method that touches tenant data without a `TenantContext` argument fails the lint rule `require-tenant-context` in CI.
4. Jobs persist `tenantId` in their payload; the worker re-verifies that the tenant exists and is active before running (TEN-006).

## 4. Enforcement layers

| Layer | Control | Failure behavior |
| --- | --- | --- |
| Transport | Webhook signature verification; TLS everywhere | Reject with 401 |
| Authentication | Session bound to user and tenant memberships | Reject with 401 |
| Authorization | RBAC check for action and tenant | Reject with 403 and audit security event |
| Application | Tenant-scoped repository queries; object lookups include `tenant_id` | Not found (404) to avoid object enumeration |
| Database | Composite foreign keys; row-level security keyed by `app.tenant_id` | Query returns no rows or is rejected |
| Cache | Keys are `t:{tenantId}:{namespace}:{key}` | Cache miss only |
| Queue | Partition by tenant; job payload includes tenant ID | Job rejected and dead-lettered |
| Object storage and exports | Paths prefixed with tenant ID; signed URLs scoped to one object | Denied |
| Signing | Per-tenant key alias in KMS | Signing fails closed if key not resolvable |

## 5. Row-level security

- Application connection role `parmana_app` is subject to RLS on all tenant tables.
- Each request or job transaction sets `SET LOCAL app.tenant_id = '<uuid>'` before any query.
- Policies: `USING (tenant_id = current_setting('app.tenant_id')::uuid)` for `SELECT`, `UPDATE`, `DELETE`, and `WITH CHECK` for `INSERT`/`UPDATE`.
- `parmana_migrator` (DDL) and `parmana_admin` (operations) are separate roles. `parmana_app` cannot `BYPASS RLS`. This is tested in TEN-012.
- RLS is defense in depth. Application queries still include `tenant_id` explicitly.

## 6. Cache safety

- No cache key may omit the tenant namespace (AC-02.5).
- Cached authorization decisions are not reused across tenants, and not reused across policy versions.
- Cache entries for policies are invalidated when a new policy version is published.

## 7. Key isolation

- Each tenant has its own signing key alias (e.g. `alias/parmana/tenant/<uuid>`).
- Rotation creates a new key version for that tenant only. Historical evidence stays verifiable by retained public keys (CRY-009, TEN-009).
- No tenant's key is usable by another tenant's context, enforced by KMS key policy and by the application's key-resolution function.

## 8. Cross-tenant attack surface

| Path | Required test |
| --- | --- |
| Client sends another tenant's object ID | TEN-002, TEN-003, TEN-004 |
| Client sends a tenant ID field | TEN-005 |
| Background job with altered tenant ID | TEN-006 |
| Cache key collision | TEN-007 |
| Webhook for installation B delivered to tenant A | TEN-008 |
| Dashboard user from A viewing B's data | TEN-010 |
| Deletion of tenant A affecting tenant B | TEN-011 |
| Direct DB access as application role bypassing RLS | TEN-012 |
| Export of A's evidence containing B's data | AUD-03, E2E-005 |

## 9. Tenant lifecycle

- **Suspension.** Suspended tenants stop processing webhooks (their deliveries are acknowledged but not evaluated and an audit event is written) and reject API writes. Read access for owners is retained for export.
- **Removal.** On `installation.deleted`, the tenant enters a `removed` state. Access is revoked immediately. Data is retained per retention policy (OD-06).
- **Deletion.** Performed only through the documented deletion workflow, which exports (if requested), deletes tenant-scoped rows and keys after the retention period, and records a deletion audit event outside the deleted tenant.
