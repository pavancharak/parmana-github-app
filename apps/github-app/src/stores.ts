/**
 * Persistence port for the GitHub App.
 *
 * Everything that must commit or roll back together for one webhook delivery
 * goes through a single transaction (docs/architecture/DATA-MODEL.md, ADR-0004):
 * the delivery claim, tenant and installation rows, repository inventory,
 * audit events and queued jobs. A failure anywhere leaves no partial state, so
 * a GitHub redelivery can be processed again from scratch.
 */

export type InstallationStatus = 'active' | 'suspended' | 'removed';
export type RepositorySelection = 'all' | 'selected';

export interface Installation {
  readonly tenantId: string;
  readonly installationId: number;
  readonly githubAccountId: number;
  repositorySelection: RepositorySelection;
  status: InstallationStatus;
}

export interface RepositoryRecord {
  readonly githubRepoId: number;
  readonly fullName: string;
}

export interface AuditEvent {
  readonly tenantId: string;
  readonly event: string;
  readonly detail: Record<string, string | number>;
}

export interface QueuedJob {
  readonly tenantId: string;
  readonly deliveryId: string;
  readonly kind: string;
  readonly payload: unknown;
}

/** Operations available inside one transaction. */
export interface Tx {
  /** Claims a delivery ID. Returns false if a committed transaction already claimed it. */
  claimDelivery(deliveryId: string): Promise<boolean>;
  /** Serializes work for one installation until the transaction ends. */
  lockInstallation(installationId: number): Promise<void>;
  findInstallation(installationId: number): Promise<Installation | undefined>;
  /** Creates the tenant and its installation in one step. */
  createTenantForInstallation(installation: Installation): Promise<void>;
  setInstallationStatus(installationId: number, status: InstallationStatus): Promise<void>;
  setRepositorySelection(installationId: number, selection: RepositorySelection): Promise<void>;
  /** Marks the given repositories active for the tenant. Existing rows are updated, not duplicated. */
  activateRepositories(tenantId: string, installationId: number, repos: readonly RepositoryRecord[]): Promise<void>;
  deactivateRepositories(tenantId: string, githubRepoIds: readonly number[]): Promise<void>;
  isRepositoryActive(tenantId: string, githubRepoId: number): Promise<boolean>;
  appendAudit(event: AuditEvent): Promise<void>;
  enqueueJob(job: QueuedJob): Promise<void>;
}

export interface UnitOfWork {
  /**
   * Runs fn in one transaction with no tenant set. Only the webhook claim and
   * the installation lookup use this. Tenant tables return no rows here (RLS, fail closed).
   * Tenant-scoped work sets the tenant with `runForTenant` or after a verified lookup.
   */
  run<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Runs fn in one transaction with app.tenant_id set to tenantId (ADR-0003). */
  runForTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
}
