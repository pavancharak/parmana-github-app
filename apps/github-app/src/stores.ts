/**
 * Storage ports for the GitHub App. Phase 1 ships in-memory adapters for
 * tests. The PostgreSQL adapters must enforce the same contracts through
 * unique constraints (docs/architecture/DATA-MODEL.md §4). Those adapters are
 * a Phase 1 follow-up and are not implemented in this change.
 */

export type InstallationStatus = 'active' | 'suspended' | 'removed';

export interface Installation {
  readonly tenantId: string;
  readonly installationId: number;
  readonly githubAccountId: number;
  status: InstallationStatus;
}

export interface InstallationStore {
  findByInstallationId(installationId: number): Promise<Installation | undefined>;
  /** Must be atomic: at most one installation row per installationId. */
  insertIfAbsent(installation: Installation): Promise<{ inserted: boolean; existing: Installation }>;
  setStatus(installationId: number, status: InstallationStatus): Promise<void>;
}

export interface AuditEvent {
  readonly tenantId: string;
  readonly event: string;
  readonly detail: Record<string, string | number>;
}

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
}

export interface DeliveryStore {
  /** True when the delivery was already fully processed. */
  isProcessed(deliveryId: string): Promise<boolean>;
  markProcessed(deliveryId: string): Promise<void>;
}

export interface JobQueue {
  /** Durable enqueue. Resolves only after the job is recorded. */
  enqueue(job: { tenantId: string; deliveryId: string; kind: string; payload: unknown }): Promise<void>;
}
