import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type QueryResultRow } from 'pg';
import { computeWebhookSignature } from '@parmana/github-client';
import { handleWebhook, type WebhookRequest } from '../src/webhook.js';
import { PgUnitOfWork } from '../src/pg/pg-unit-of-work.js';
import { migrate } from '../src/pg/migrate.js';
import { assertRepositoryAccess, RepositoryAccessDeniedError } from '../src/access.js';
import type { Tx, UnitOfWork } from '../src/stores.js';

/**
 * Integration tests against a real PostgreSQL server. They run only when
 * PG_ADMIN_URL is set, for example postgres://postgres@127.0.0.1:54399/postgres.
 *
 * Three connections are used, matching production roles:
 * - admin: the superuser that runs migrations and verifies results. Not used by the code under test.
 * - app: the parmana_app role (non-owner, no BYPASSRLS). All code under test uses this.
 * - tenant-scoped sessions: parmana_app with app.tenant_id set, for isolation checks.
 *
 * Each run creates its own database and drops it afterward.
 */
const ADMIN_URL = process.env.PG_ADMIN_URL;
const MIGRATIONS = fileURLToPath(new URL('../../../database/migrations', import.meta.url));
const SECRET = 'pg-test-secret';
// Test-only password for parmana_app. Servers that require password login (CI, production) need one.
const APP_TEST_PASSWORD = 'parmana-test-app-password';
const enc = new TextEncoder();

function signed(event: string, deliveryId: string, payload: unknown): WebhookRequest {
  const rawBody = enc.encode(JSON.stringify(payload));
  return { rawBody, headers: { signature256: computeWebhookSignature(SECRET, rawBody), event, deliveryId } };
}

const created = (id: number, repos: Array<{ id: number; full_name: string }> = []) => ({
  action: 'created',
  installation: { id, account: { id: 555 }, repository_selection: 'selected' },
  repositories: repos,
});

function failingAudit(inner: UnitOfWork): UnitOfWork {
  const failing = (tx: Tx): Tx =>
    new Proxy(tx, {
      get(t, p, r) {
        if (p === 'appendAudit') {
          return async () => {
            throw new Error('audit down');
          };
        }
        return Reflect.get(t, p, r) as unknown;
      },
    });
  return {
    run: (fn) => inner.run((tx) => fn(failing(tx))),
    runForTenant: (id, fn) => inner.runForTenant(id, (tx) => fn(failing(tx))),
  };
}

describe.skipIf(!ADMIN_URL)('PostgreSQL adapter and row-level security (ADR-0003, TEN-*, GH-008)', () => {
  let dbName: string;
  let adminPool: Pool;
  let appPool: Pool;
  let uow: PgUnitOfWork;
  let tenantCounter = 0;
  let deps: { secret: string; uow: UnitOfWork; newTenantId: () => string };

  /** Runs SQL as parmana_app inside a transaction with app.tenant_id set (or unset when tenantId is undefined). */
  async function asTenant<R extends QueryResultRow = QueryResultRow>(tenantId: string | undefined, sql: string, params: unknown[] = []) {
    const client = await appPool.connect();
    try {
      await client.query('BEGIN');
      if (tenantId !== undefined) {
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      }
      const res = await client.query<R>(sql, params);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const adminCount = async (table: string, where = 'true', params: unknown[] = []) =>
    Number((await adminPool.query(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, params)).rows[0]?.n);

  const tenantOf = async (installationId: number): Promise<string> =>
    (await adminPool.query<{ tenant_id: string }>('SELECT tenant_id FROM github_installations WHERE installation_id = $1', [installationId])).rows[0]!.tenant_id;

  beforeAll(async () => {
    dbName = `parmana_test_${randomBytes(6).toString('hex')}`;
    const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
    await admin.query(`CREATE DATABASE ${dbName}`);
    await admin.end();

    const adminUrl = new URL(ADMIN_URL as string);
    adminUrl.pathname = `/${dbName}`;
    adminPool = new Pool({ connectionString: adminUrl.toString(), max: 2 });
    await migrate(adminPool, MIGRATIONS);

    // Production sets this role's LOGIN and password as an operations step. The test does it here.
    await adminPool.query(`ALTER ROLE parmana_app LOGIN PASSWORD '${APP_TEST_PASSWORD}'`);
    const appUrl = new URL(adminUrl.toString());
    appUrl.username = 'parmana_app';
    appUrl.password = APP_TEST_PASSWORD;
    appPool = new Pool({ connectionString: appUrl.toString(), max: 10 });

    uow = new PgUnitOfWork(appPool);
    deps = {
      secret: SECRET,
      uow,
      newTenantId: () => `00000000-0000-4000-8000-${String(++tenantCounter).padStart(12, '0')}`,
    };
  });

  afterAll(async () => {
    if (appPool) await appPool.end();
    if (adminPool) await adminPool.end();
    if (ADMIN_URL && dbName) {
      const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await admin.end();
    }
  });

  // ---- persistence and atomicity -------------------------------------------

  it('migrations apply once and re-running them applies nothing', async () => {
    expect(await migrate(adminPool, MIGRATIONS)).toEqual([]);
    expect(await adminCount('schema_migrations', "version IN ('0001_phase1_core.sql', '0002_rls.sql')")).toBe(2);
  });

  it('audit_events rejects UPDATE and DELETE, including from the app role (AC-13.2)', async () => {
    await handleWebhook(signed('installation', 'pg-audit-1', created(4001)), deps);
    await expect(asTenant(await tenantOf(4001), 'UPDATE audit_events SET event = $1', ['tampered'])).rejects.toThrow();
    await expect(asTenant(await tenantOf(4001), 'DELETE FROM audit_events')).rejects.toThrow();
  });

  it('constraints reject an invalid installation status and a duplicate installation identity', async () => {
    await expect(
      adminPool.query(
        "INSERT INTO github_installations (installation_id, tenant_id, github_account_id, repository_selection, status) VALUES (9, gen_random_uuid(), 1, 'all', 'bogus')",
      ),
    ).rejects.toThrow();
    await expect(
      adminPool.query(
        "INSERT INTO github_installations (installation_id, tenant_id, github_account_id, repository_selection, status) VALUES (4001, gen_random_uuid(), 1, 'all', 'active')",
      ),
    ).rejects.toThrow();
  });

  it('GH-008 / atomicity: an audit failure leaves no tenant, installation, repository or claim, and retry succeeds', async () => {
    const before = { tenants: await adminCount('tenants'), installs: await adminCount('github_installations') };
    const req = signed('installation', 'pg-rollback-1', created(4002, [{ id: 70, full_name: 'o/r' }]));

    await expect(handleWebhook(req, { ...deps, uow: failingAudit(uow) })).rejects.toThrow('audit down');
    expect(await adminCount('tenants')).toBe(before.tenants);
    expect(await adminCount('github_installations')).toBe(before.installs);
    expect(await adminCount('webhook_deliveries', "delivery_id = 'pg-rollback-1'")).toBe(0);

    const retry = await handleWebhook(req, deps);
    expect(retry).toMatchObject({ status: 202, detail: { kind: 'tenant_created' } });
    expect(await adminCount('github_installations', 'installation_id = 4002')).toBe(1);
  });

  it('CONCURRENCY: five simultaneous created events for one installation create exactly one tenant', async () => {
    const events = Array.from({ length: 5 }, (_, i) => signed('installation', `pg-race-${i}`, created(4003)));
    const results = await Promise.all(events.map((e) => handleWebhook(e, deps)));
    const creations = results.filter((r) => r.status === 202 && r.detail && 'kind' in r.detail && r.detail.kind === 'tenant_created');
    expect(creations).toHaveLength(1);
    expect(await adminCount('github_installations', 'installation_id = 4003')).toBe(1);
    expect(await adminCount('tenants t JOIN github_installations g ON g.tenant_id = t.id', 'g.installation_id = 4003')).toBe(1);
  });

  it('CONCURRENCY: five simultaneous copies of one delivery are processed exactly once (GH-008)', async () => {
    const req = signed('installation', 'pg-dup-1', created(4004));
    const results = await Promise.all(Array.from({ length: 5 }, () => handleWebhook(req, deps)));
    expect(results.filter((r) => r.status === 202)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(4);
    expect(await adminCount('audit_events', "event = 'installation.created' AND detail->>'installationId' = '4004'")).toBe(1);
  });

  it('GH-003 / GH-014: repository access is enforced from the stored inventory', async () => {
    await handleWebhook(signed('installation', 'pg-repo-1', created(4005, [{ id: 88, full_name: 'o/allowed' }])), deps);
    const ctx = { tenantId: await tenantOf(4005), installationId: 4005, actor: { type: 'app' as const, id: 'test' } };

    await expect(assertRepositoryAccess(uow, ctx, 88)).resolves.toBeUndefined();
    await expect(assertRepositoryAccess(uow, ctx, 89)).rejects.toBeInstanceOf(RepositoryAccessDeniedError);

    await handleWebhook(
      signed('installation_repositories', 'pg-repo-2', {
        action: 'removed',
        installation: { id: 4005, account: { id: 555 }, repository_selection: 'selected' },
        repositories_removed: [{ id: 88 }],
      }),
      deps,
    );
    await expect(assertRepositoryAccess(uow, ctx, 88)).rejects.toBeInstanceOf(RepositoryAccessDeniedError);
  });

  it('TEN-005: a pull request queues a job for the stored tenant, in the same transaction as the claim', async () => {
    await handleWebhook(signed('installation', 'pg-pr-0', created(4006)), deps);
    const res = await handleWebhook(
      signed('pull_request', 'pg-pr-1', {
        action: 'opened',
        installation: { id: 4006, account: { id: 555 }, repository_selection: 'selected' },
        tenant_id: '00000000-0000-4000-8000-999999999999',
      }),
      deps,
    );
    expect(res).toMatchObject({ status: 202, detail: { kind: 'enqueued' } });
    const job = (await adminPool.query<{ tenant_id: string }>("SELECT tenant_id FROM jobs WHERE delivery_id = 'pg-pr-1'")).rows[0];
    expect(job?.tenant_id).toBe(await tenantOf(4006));
  });

  // ---- row-level security (TEN-012) ----------------------------------------

  it('TEN-012: the application role is not a superuser and cannot bypass RLS', async () => {
    const res = await adminPool.query<{ rolsuper: boolean; rolbypassrls: boolean; rolname: string }>(
      "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'parmana_app'",
    );
    expect(res.rows[0]).toEqual({ rolname: 'parmana_app', rolsuper: false, rolbypassrls: false });
  });

  it('TEN-012: a session sees only its own tenant\'s installations, repositories and audit events', async () => {
    await handleWebhook(signed('installation', 'pg-iso-a', created(4101, [{ id: 501, full_name: 'a/repo' }])), deps);
    await handleWebhook(signed('installation', 'pg-iso-b', created(4102, [{ id: 502, full_name: 'b/repo' }])), deps);
    const a = await tenantOf(4101);
    const b = await tenantOf(4102);

    const inst = await asTenant<{ installation_id: string }>(a, 'SELECT installation_id FROM github_installations ORDER BY installation_id');
    expect(inst.rows.map((r) => Number(r.installation_id))).toEqual([4101]);

    const repos = await asTenant<{ github_repo_id: string }>(a, 'SELECT github_repo_id FROM repositories ORDER BY github_repo_id');
    expect(repos.rows.map((r) => Number(r.github_repo_id))).toEqual([501]);

    const audit = await asTenant<{ tenant_id: string }>(a, 'SELECT DISTINCT tenant_id FROM audit_events');
    expect(audit.rows.map((r) => r.tenant_id)).toEqual([a]);

    const fromB = await asTenant(b, 'SELECT 1 FROM github_installations WHERE installation_id = 4101');
    expect(fromB.rowCount).toBe(0);
  });

  it('TEN-012 / fail closed: with no tenant set, tenant tables return no rows', async () => {
    const tables = ['tenants', 'github_installations', 'repositories', 'audit_events', 'jobs'];
    for (const t of tables) {
      const res = await asTenant(undefined, `SELECT count(*) AS n FROM ${t}`);
      expect(Number(res.rows[0]?.['n'])).toBe(0);
    }
  });

  it('TEN-012: a session cannot insert a row that belongs to another tenant', async () => {
    const a = await tenantOf(4101);
    const b = await tenantOf(4102);
    await expect(
      asTenant(a, "INSERT INTO audit_events (tenant_id, event, detail) VALUES ($1, 'forged', '{}')", [b]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asTenant(a, "INSERT INTO jobs (tenant_id, delivery_id, kind, payload) VALUES ($1, 'pg-iso-a', 'forged', '{}')", [b]),
    ).rejects.toThrow(/row-level security/);
  });

  it('TEN-002 / TEN-003: a session cannot modify another tenant\'s installation', async () => {
    const a = await tenantOf(4101);
    const res = await asTenant(a, "UPDATE github_installations SET status = 'removed' WHERE installation_id = 4102");
    expect(res.rowCount).toBe(0);
    expect(await adminCount('github_installations', "installation_id = 4102 AND status = 'active'")).toBe(1);
  });

  it('TEN-012: lookup_installation resolves an installation before the tenant is known (ingress bootstrap)', async () => {
    const res = await asTenant<{ tenant_id: string }>(undefined, 'SELECT tenant_id FROM lookup_installation(4102)');
    expect(res.rows[0]?.tenant_id).toBe(await tenantOf(4102));
  });

  it('TEN-004: evidence (audit) written for tenant B is not visible to tenant A through the application path', async () => {
    const jobOwnerB = await tenantOf(4102);
    await handleWebhook(
      signed('pull_request', 'pg-iso-pr-b', {
        action: 'opened',
        installation: { id: 4102, account: { id: 555 }, repository_selection: 'selected' },
      }),
      deps,
    );
    const seenByA = await asTenant(await tenantOf(4101), "SELECT 1 FROM jobs WHERE delivery_id = 'pg-iso-pr-b'");
    expect(seenByA.rowCount).toBe(0);
    const seenByB = await asTenant(jobOwnerB, "SELECT 1 FROM jobs WHERE delivery_id = 'pg-iso-pr-b'");
    expect(seenByB.rowCount).toBe(1);
  });
});
