import type { Pool, PoolClient } from 'pg';
import type { Installation, InstallationStatus, RepositoryRecord, RepositorySelection, Tx, UnitOfWork } from '../stores.js';

/**
 * PostgreSQL adapter. Each run() is one database transaction.
 * The unique and check constraints in database/migrations/0001_phase1_core.sql
 * back the invariants. The advisory lock in lockInstallation serializes
 * lifecycle events for the same installation, so two concurrent `created`
 * events cannot both create a tenant.
 */
export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.execute(undefined, fn);
  }

  async runForTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.execute(tenantId, fn);
  }

  private async execute<T>(tenantId: string | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx = new PgTx(client);
      if (tenantId !== undefined) await tx.setTenant(tenantId);
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

interface InstallationRow {
  tenant_id: string;
  installation_id: string;
  github_account_id: string;
  repository_selection: RepositorySelection;
  status: InstallationStatus;
}

const toInstallation = (r: InstallationRow): Installation => ({
  tenantId: r.tenant_id,
  installationId: Number(r.installation_id),
  githubAccountId: Number(r.github_account_id),
  repositorySelection: r.repository_selection,
  status: r.status,
});

class PgTx implements Tx {
  constructor(private readonly c: PoolClient) {}

  /** Sets app.tenant_id for this transaction only (is_local = true). */
  async setTenant(tenantId: string): Promise<void> {
    await this.c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
  }

  async claimDelivery(deliveryId: string): Promise<boolean> {
    const res = await this.c.query(
      'INSERT INTO webhook_deliveries (delivery_id) VALUES ($1) ON CONFLICT (delivery_id) DO NOTHING',
      [deliveryId],
    );
    return res.rowCount === 1;
  }

  async lockInstallation(installationId: number): Promise<void> {
    await this.c.query('SELECT pg_advisory_xact_lock($1::bigint)', [installationId]);
  }

  /**
   * Bootstrap lookup through the SECURITY DEFINER function, since RLS needs the
   * tenant and the tenant is what we are looking up. Once found, the tenant is
   * set for this transaction, so every later statement is tenant-scoped.
   */
  async findInstallation(installationId: number): Promise<Installation | undefined> {
    const res = await this.c.query<InstallationRow>('SELECT * FROM lookup_installation($1::bigint)', [installationId]);
    const row = res.rows[0];
    if (!row) return undefined;
    await this.setTenant(row.tenant_id);
    return toInstallation(row);
  }

  async createTenantForInstallation(i: Installation): Promise<void> {
    // The tenant is set before its row is written, so the WITH CHECK policies accept it.
    await this.setTenant(i.tenantId);
    await this.c.query('INSERT INTO tenants (id) VALUES ($1)', [i.tenantId]);
    await this.c.query(
      'INSERT INTO github_installations (installation_id, tenant_id, github_account_id, repository_selection, status) VALUES ($1, $2, $3, $4, $5)',
      [i.installationId, i.tenantId, i.githubAccountId, i.repositorySelection, i.status],
    );
  }

  async setInstallationStatus(installationId: number, status: InstallationStatus): Promise<void> {
    await this.c.query('UPDATE github_installations SET status = $2, updated_at = now() WHERE installation_id = $1', [
      installationId,
      status,
    ]);
  }

  async setRepositorySelection(installationId: number, selection: RepositorySelection): Promise<void> {
    await this.c.query(
      'UPDATE github_installations SET repository_selection = $2, updated_at = now() WHERE installation_id = $1',
      [installationId, selection],
    );
  }

  async activateRepositories(tenantId: string, installationId: number, repos: readonly RepositoryRecord[]): Promise<void> {
    for (const r of repos) {
      await this.c.query(
        `INSERT INTO repositories (tenant_id, github_repo_id, installation_id, full_name, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (tenant_id, github_repo_id)
         DO UPDATE SET active = true, full_name = EXCLUDED.full_name, updated_at = now()`,
        [tenantId, r.githubRepoId, installationId, r.fullName],
      );
    }
  }

  async deactivateRepositories(tenantId: string, githubRepoIds: readonly number[]): Promise<void> {
    if (githubRepoIds.length === 0) return;
    await this.c.query(
      'UPDATE repositories SET active = false, updated_at = now() WHERE tenant_id = $1 AND github_repo_id = ANY($2::bigint[])',
      [tenantId, githubRepoIds],
    );
  }

  async isRepositoryActive(tenantId: string, githubRepoId: number): Promise<boolean> {
    const res = await this.c.query<{ active: boolean }>(
      'SELECT active FROM repositories WHERE tenant_id = $1 AND github_repo_id = $2',
      [tenantId, githubRepoId],
    );
    return res.rows[0]?.active === true;
  }

  async appendAudit(e: { tenantId: string; event: string; detail: Record<string, string | number> }): Promise<void> {
    await this.c.query('INSERT INTO audit_events (tenant_id, event, detail) VALUES ($1, $2, $3::jsonb)', [
      e.tenantId,
      e.event,
      JSON.stringify(e.detail),
    ]);
  }

  async enqueueJob(j: { tenantId: string; deliveryId: string; kind: string; payload: unknown }): Promise<void> {
    await this.c.query('INSERT INTO jobs (tenant_id, delivery_id, kind, payload) VALUES ($1, $2, $3, $4::jsonb)', [
      j.tenantId,
      j.deliveryId,
      j.kind,
      JSON.stringify(j.payload),
    ]);
  }
}
