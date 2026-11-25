import type {
  AuditEvent,
  Installation,
  InstallationStatus,
  QueuedJob,
  RepositoryRecord,
  RepositorySelection,
  Tx,
  UnitOfWork,
} from './stores.js';

/** Full state of the in-memory store. Used only by tests. */
export interface MemoryState {
  installations: Map<number, Installation>;
  repositories: Map<string, { tenantId: string; installationId: number; fullName: string; active: boolean }>;
  deliveries: Set<string>;
  audit: AuditEvent[];
  jobs: QueuedJob[];
}

function emptyState(): MemoryState {
  return { installations: new Map(), repositories: new Map(), deliveries: new Set(), audit: [], jobs: [] };
}

const repoKey = (tenantId: string, githubRepoId: number) => `${tenantId}:${githubRepoId}`;

/**
 * Transactional in-memory adapter. A transaction works on a copy of the state
 * and replaces the committed state only when the callback resolves, which
 * gives the same all-or-nothing behavior as the PostgreSQL adapter.
 *
 * Transactions run one at a time. This adapter does not model concurrency.
 * Concurrency is tested against PostgreSQL.
 */
export class MemoryUnitOfWork implements UnitOfWork {
  private committed: MemoryState = emptyState();

  get state(): Readonly<MemoryState> {
    return this.committed;
  }

  async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const draft = structuredClone(this.committed);
    const result = await fn(new MemoryTx(draft));
    this.committed = draft;
    return result;
  }

  /**
   * The memory adapter does not enforce tenant isolation. The PostgreSQL adapter
   * does, through RLS (TEN-012). Tests for isolation run against PostgreSQL.
   */
  async runForTenant<T>(_tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.run(fn);
  }
}

class MemoryTx implements Tx {
  constructor(private readonly s: MemoryState) {}

  async claimDelivery(deliveryId: string): Promise<boolean> {
    if (this.s.deliveries.has(deliveryId)) return false;
    this.s.deliveries.add(deliveryId);
    return true;
  }

  async lockInstallation(): Promise<void> {
    // No concurrency in this adapter.
  }

  async findInstallation(installationId: number): Promise<Installation | undefined> {
    const row = this.s.installations.get(installationId);
    return row ? { ...row } : undefined;
  }

  async createTenantForInstallation(installation: Installation): Promise<void> {
    if (this.s.installations.has(installation.installationId)) {
      throw new Error('installation already exists');
    }
    this.s.installations.set(installation.installationId, { ...installation });
  }

  async setInstallationStatus(installationId: number, status: InstallationStatus): Promise<void> {
    const row = this.s.installations.get(installationId);
    if (!row) throw new Error(`unknown installation ${installationId}`);
    row.status = status;
  }

  async setRepositorySelection(installationId: number, selection: RepositorySelection): Promise<void> {
    const row = this.s.installations.get(installationId);
    if (!row) throw new Error(`unknown installation ${installationId}`);
    row.repositorySelection = selection;
  }

  async activateRepositories(tenantId: string, installationId: number, repos: readonly RepositoryRecord[]): Promise<void> {
    for (const r of repos) {
      this.s.repositories.set(repoKey(tenantId, r.githubRepoId), {
        tenantId,
        installationId,
        fullName: r.fullName,
        active: true,
      });
    }
  }

  async deactivateRepositories(tenantId: string, githubRepoIds: readonly number[]): Promise<void> {
    for (const id of githubRepoIds) {
      const row = this.s.repositories.get(repoKey(tenantId, id));
      if (row) row.active = false;
    }
  }

  async isRepositoryActive(tenantId: string, githubRepoId: number): Promise<boolean> {
    return this.s.repositories.get(repoKey(tenantId, githubRepoId))?.active === true;
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    this.s.audit.push({ ...event, detail: { ...event.detail } });
  }

  async enqueueJob(job: QueuedJob): Promise<void> {
    this.s.jobs.push({ ...job });
  }
}
