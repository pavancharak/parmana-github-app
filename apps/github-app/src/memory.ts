import type {
  AuditEvent,
  AuditStore,
  DeliveryStore,
  Installation,
  InstallationStatus,
  InstallationStore,
  JobQueue,
} from './stores.js';

export class MemoryInstallationStore implements InstallationStore {
  private readonly rows = new Map<number, Installation>();

  async findByInstallationId(installationId: number): Promise<Installation | undefined> {
    const row = this.rows.get(installationId);
    return row ? { ...row } : undefined;
  }

  async insertIfAbsent(installation: Installation) {
    const existing = this.rows.get(installation.installationId);
    if (existing) {
      return { inserted: false, existing: { ...existing } };
    }
    this.rows.set(installation.installationId, { ...installation });
    return { inserted: true, existing: { ...installation } };
  }

  async setStatus(installationId: number, status: InstallationStatus): Promise<void> {
    const row = this.rows.get(installationId);
    if (!row) throw new Error(`unknown installation ${installationId}`);
    row.status = status;
  }
}

export class MemoryAuditStore implements AuditStore {
  readonly events: AuditEvent[] = [];
  async append(event: AuditEvent): Promise<void> {
    this.events.push({ ...event, detail: { ...event.detail } });
  }
}

export class MemoryDeliveryStore implements DeliveryStore {
  private readonly processed = new Set<string>();
  async isProcessed(deliveryId: string): Promise<boolean> {
    return this.processed.has(deliveryId);
  }
  async markProcessed(deliveryId: string): Promise<void> {
    this.processed.add(deliveryId);
  }
}

export class MemoryJobQueue implements JobQueue {
  readonly jobs: Array<{ tenantId: string; deliveryId: string; kind: string; payload: unknown }> = [];
  async enqueue(job: { tenantId: string; deliveryId: string; kind: string; payload: unknown }): Promise<void> {
    this.jobs.push(job);
  }
}
