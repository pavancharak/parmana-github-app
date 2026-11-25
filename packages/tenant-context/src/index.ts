/**
 * Tenant context is the only way application services address tenant data
 * (docs/architecture/TENANT-ISOLATION.md §3, ADR-0003).
 *
 * It is constructed only from verified inputs. Nothing in this module reads
 * a tenant identifier from a request body, query, or header.
 */

export type Role = 'owner' | 'security_admin' | 'engineering_admin' | 'approver' | 'developer' | 'auditor';

export interface TenantContext {
  readonly tenantId: string;
  readonly installationId: number;
  readonly actor: { readonly type: 'user' | 'app' | 'job'; readonly id: string; readonly role?: Role };
  readonly originatingJobId?: string;
}

export interface VerifiedInstallation {
  readonly tenantId: string;
  readonly installationId: number;
  readonly status: 'active' | 'suspended' | 'removed';
}

/**
 * Builds a context for work done on behalf of a GitHub installation.
 * Throws when the installation is not active: no tenant context, no access (INV-1).
 */
export function tenantContextForInstallation(
  installation: VerifiedInstallation,
  actorId: string,
): TenantContext {
  if (installation.status !== 'active') {
    throw new TenantNotActiveError(installation.tenantId, installation.status);
  }
  return {
    tenantId: installation.tenantId,
    installationId: installation.installationId,
    actor: { type: 'app', id: actorId },
  };
}

export class TenantNotActiveError extends Error {
  readonly code = 'tenant_not_active';
  constructor(
    readonly tenantId: string,
    readonly status: string,
  ) {
    super(`tenant ${tenantId} is ${status}`);
    this.name = 'TenantNotActiveError';
  }
}
