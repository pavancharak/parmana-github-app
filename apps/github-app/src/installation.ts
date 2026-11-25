import type { RepositoryRecord, RepositorySelection, InstallationStatus, Tx } from './stores.js';

/** The parts of GitHub's `installation` webhook payload this handler uses. */
export interface InstallationPayload {
  readonly action: string;
  readonly installation: {
    readonly id: number;
    readonly account: { readonly id: number };
    readonly repository_selection: RepositorySelection;
  };
  readonly repositories?: readonly { id: number; full_name: string }[];
}

/** The parts of GitHub's `installation_repositories` webhook payload this handler uses. */
export interface InstallationRepositoriesPayload {
  readonly action: string;
  readonly installation: {
    readonly id: number;
    readonly account: { readonly id: number };
    readonly repository_selection: RepositorySelection;
  };
  readonly repositories_added?: readonly { id: number; full_name: string }[];
  readonly repositories_removed?: readonly { id: number }[];
}

export type InstallationOutcome =
  | { kind: 'tenant_created'; tenantId: string; repositories: number }
  | { kind: 'already_exists'; tenantId: string }
  | { kind: 'status_changed'; tenantId: string; status: InstallationStatus }
  | { kind: 'unchanged'; tenantId: string; status: InstallationStatus }
  | { kind: 'repositories_reconciled'; tenantId: string; added: number; removed: number }
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
 * Applies a GitHub `installation` lifecycle event (FR-01,
 * docs/architecture/GITHUB-INTEGRATION.md §2). Must run inside a transaction.
 *
 * - `created` creates exactly one tenant per installation ID (GH-001, GH-002).
 * - `suspend`, `unsuspend` and `deleted` change status. Unknown installations are rejected (FR-01.6).
 * - A removed installation is terminal (GH-005).
 * - Every change is audited (FR-01.8).
 */
export async function applyInstallationEvent(
  payload: InstallationPayload,
  tx: Tx,
  newTenantId: () => string,
): Promise<InstallationOutcome> {
  const installationId = payload.installation.id;
  await tx.lockInstallation(installationId);

  if (payload.action === 'created') {
    const existing = await tx.findInstallation(installationId);
    if (existing) {
      await tx.appendAudit({
        tenantId: existing.tenantId,
        event: 'installation.created.duplicate',
        detail: { installationId },
      });
      return { kind: 'already_exists', tenantId: existing.tenantId };
    }

    const tenantId = newTenantId();
    await tx.createTenantForInstallation({
      tenantId,
      installationId,
      githubAccountId: payload.installation.account.id,
      repositorySelection: payload.installation.repository_selection,
      status: 'active',
    });
    const repos: RepositoryRecord[] = (payload.repositories ?? []).map((r) => ({
      githubRepoId: r.id,
      fullName: r.full_name,
    }));
    await tx.activateRepositories(tenantId, installationId, repos);
    await tx.appendAudit({ tenantId, event: 'installation.created', detail: { installationId, repositories: repos.length } });
    return { kind: 'tenant_created', tenantId, repositories: repos.length };
  }

  const target = STATUS_BY_ACTION[payload.action];
  if (target === undefined) {
    return { kind: 'ignored', action: payload.action };
  }

  const current = await tx.findInstallation(installationId);
  if (!current) {
    throw new UnknownInstallationError(installationId);
  }
  if (current.status === 'removed' || current.status === target) {
    return { kind: 'unchanged', tenantId: current.tenantId, status: current.status };
  }

  await tx.setInstallationStatus(installationId, target);
  await tx.appendAudit({
    tenantId: current.tenantId,
    event: `installation.${payload.action}`,
    detail: { installationId },
  });
  return { kind: 'status_changed', tenantId: current.tenantId, status: target };
}

/**
 * Applies a GitHub `installation_repositories` event: repositories added to or
 * removed from the installation's selection (GH-003, FR-01.7). Must run inside a transaction.
 */
export async function applyInstallationRepositoriesEvent(
  payload: InstallationRepositoriesPayload,
  tx: Tx,
): Promise<InstallationOutcome> {
  const installationId = payload.installation.id;
  await tx.lockInstallation(installationId);

  const current = await tx.findInstallation(installationId);
  if (!current) {
    throw new UnknownInstallationError(installationId);
  }

  await tx.setRepositorySelection(installationId, payload.installation.repository_selection);

  const added = (payload.repositories_added ?? []).map((r) => ({ githubRepoId: r.id, fullName: r.full_name }));
  const removedIds = (payload.repositories_removed ?? []).map((r) => r.id);
  if (added.length > 0) {
    await tx.activateRepositories(current.tenantId, installationId, added);
  }
  if (removedIds.length > 0) {
    await tx.deactivateRepositories(current.tenantId, removedIds);
  }
  await tx.appendAudit({
    tenantId: current.tenantId,
    event: 'installation_repositories.reconciled',
    detail: { installationId, added: added.length, removed: removedIds.length },
  });
  return { kind: 'repositories_reconciled', tenantId: current.tenantId, added: added.length, removed: removedIds.length };
}
