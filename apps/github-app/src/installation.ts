import type { AuditStore, Installation, InstallationStatus, InstallationStore } from './stores.js';

/** The subset of GitHub's installation webhook payload this handler uses. */
export interface InstallationPayload {
  readonly action: string;
  readonly installation: { readonly id: number; readonly account: { readonly id: number } };
}

export type InstallationOutcome =
  | { kind: 'tenant_created'; tenantId: string }
  | { kind: 'already_exists'; tenantId: string }
  | { kind: 'status_changed'; tenantId: string; status: InstallationStatus }
  | { kind: 'unchanged'; tenantId: string; status: InstallationStatus }
  | { kind: 'ignored'; action: string };

export class UnknownInstallationError extends Error {
  readonly code = 'unknown_installation';
  constructor(readonly installationId: number) {
    super(`installation ${installationId} is not known`);
    this.name = 'UnknownInstallationError';
  }
}

const STATUS_BY_ACTION: Record<string, InstallationStatus> = {
  suspend: 'suspended',
  unsuspend: 'active',
  deleted: 'removed',
};

/**
 * Applies a GitHub installation lifecycle event (FR-01, docs/architecture/GITHUB-INTEGRATION.md §2).
 *
 * - `created` creates exactly one tenant per installation ID (GH-001, GH-002).
 * - `suspend`, `unsuspend` and `deleted` change status and are rejected for unknown installations (FR-01.6).
 * - Every change is audited (FR-01.8).
 */
export async function applyInstallationEvent(
  payload: InstallationPayload,
  stores: { installations: InstallationStore; audit: AuditStore; newTenantId: () => string },
): Promise<InstallationOutcome> {
  const installationId = payload.installation.id;

  if (payload.action === 'created') {
    const candidate: Installation = {
      tenantId: stores.newTenantId(),
      installationId,
      githubAccountId: payload.installation.account.id,
      status: 'active',
    };
    const { inserted, existing } = await stores.installations.insertIfAbsent(candidate);
    if (inserted) {
      await stores.audit.append({
        tenantId: candidate.tenantId,
        event: 'installation.created',
        detail: { installationId },
      });
      return { kind: 'tenant_created', tenantId: candidate.tenantId };
    }
    await stores.audit.append({
      tenantId: existing.tenantId,
      event: 'installation.created.duplicate',
      detail: { installationId },
    });
    return { kind: 'already_exists', tenantId: existing.tenantId };
  }

  const target = STATUS_BY_ACTION[payload.action];
  if (target === undefined) {
    return { kind: 'ignored', action: payload.action };
  }

  const current = await stores.installations.findByInstallationId(installationId);
  if (!current) {
    throw new UnknownInstallationError(installationId);
  }

  if (current.status === target) {
    return { kind: 'unchanged', tenantId: current.tenantId, status: target };
  }

  // A removed installation is terminal. A later event cannot make it active again (FR-01.6, GH-005).
  if (current.status === 'removed') {
    return { kind: 'unchanged', tenantId: current.tenantId, status: 'removed' };
  }

  await stores.installations.setStatus(installationId, target);
  await stores.audit.append({
    tenantId: current.tenantId,
    event: `installation.${payload.action}`,
    detail: { installationId, from: current.status, to: target },
  });
  return { kind: 'status_changed', tenantId: current.tenantId, status: target };
}
