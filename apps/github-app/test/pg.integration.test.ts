import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { computeWebhookSignature } from '@parmana/github-client';
import { handleWebhook, type WebhookRequest } from '../src/webhook.js';
import { PgUnitOfWork } from '../src/pg/pg-unit-of-work.js';
import { migrate } from '../src/pg/migrate.js';
import { assertRepositoryAccess, RepositoryAccessDeniedError } from '../src/access.js';
import type { Tx, UnitOfWork } from '../src/stores.js';

/**
 * Integration tests against a real PostgreSQL server. They run only when
 * PG_ADMIN_URL is set, for example postgres://postgres@127.0.0.1:54399/postgres.
 * Each run creates its own database and drops it at the end.
 */
const ADMIN_URL = process.env.PG_ADMIN_URL;
const MIGRATIONS = fileURLToPath(new URL('../../../database/migrations', import.meta.url));
const SECRET = 'pg-test-secret';
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
  return {
    run: (fn) =>
      inner.run((tx: Tx) =>
        fn(
          new Proxy(tx, {
            get(t, p, r) {
              if (p === 'appendAudit') {
                return async () => {
                  throw new Error('audit down');
                };
              }
              return Reflect.get(t, p, r) as unknown;
            },
          }),
        ),
      ),
  };
}

describe.skipIf(!ADMIN_URL)('PostgreSQL adapter (ADR-0003, ADR-0004, TEN-*, GH-008)', () => {
  let dbName: string;
  let pool: Pool;
  let uow: PgUnitOfWork;
  let tenantCounter = 0;
  let deps: { secret: string; uow: UnitOfWork; newTenantId: () => string };

  beforeAll(async () => {
    dbName = `parmana_test_${randomBytes(6).toString('hex')}`;
    const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
    await admin.query(`CREATE DATABASE ${dbName}`);
    await admin.end();

    const url = new URL(ADMIN_URL as string);
    url.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: url.toString(), max: 10 });
    await migrate(pool, MIGRATIONS);
    uow = new PgUnitOfWork(pool);
    deps = { secret: SECRET, uow, newTenantId: () => `00000000-0000-4000-8000-${String(++tenantCounter).padStart(12, '0')}` };
  });

  afterAll(async () => {
    if (pool) await pool.end();
    if (ADMIN_URL && dbName) {
      const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await admin.end();
    }
  });

  const count = async (table: string) => Number((await pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0]?.n);

  it('migrations apply once and re-running them applies nothing', async () => {
    const again = await migrate(pool, MIGRATIONS);
    expect(again).toEqual([]);
    const row = await pool.query("SELECT 1 FROM schema_migrations WHERE version = '0001_phase1_core.sql'");
    expect(row.rowCount).toBe(1);
  });

  it('audit_events rejects UPDATE and DELETE (AC-13.2)', async () => {
    await handleWebhook(signed('installation', 'pg-audit-1', created(4001)), deps);
    await expect(pool.query('UPDATE audit_events SET event = $1', ['tampered'])).rejects.toThrow('append-only');
    await expect(pool.query('DELETE FROM audit_events')).rejects.toThrow('append-only');
  });

  it('constraints reject an invalid installation status and a duplicate installation identity', async () => {
    await expect(
      pool.query(
        "INSERT INTO github_installations (installation_id, tenant_id, github_account_id, repository_selection, status) VALUES (9, gen_random_uuid(), 1, 'all', 'bogus')",
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "INSERT INTO github_installations (installation_id, tenant_id, github_account_id, repository_selection, status) VALUES (4001, gen_random_uuid(), 1, 'all', 'active')",
      ),
    ).rejects.toThrow();
  });

  it('GH-008 / atomicity: an audit failure leaves no tenant, installation, repository or claim, and retry succeeds', async () => {
    const before = { tenants: await count('tenants'), installs: await count('github_installations') };
    const req = signed('installation', 'pg-rollback-1', created(4002, [{ id: 70, full_name: 'o/r' }]));

    await expect(handleWebhook(req, { ...deps, uow: failingAudit(uow) })).rejects.toThrow('audit down');
    expect(await count('tenants')).toBe(before.tenants);
    expect(await count('github_installations')).toBe(before.installs);
    expect(
      Number((await pool.query("SELECT count(*) AS n FROM webhook_deliveries WHERE delivery_id = 'pg-rollback-1'")).rows[0]?.n),
    ).toBe(0);

    const retry = await handleWebhook(req, deps);
    expect(retry).toMatchObject({ status: 202, detail: { kind: 'tenant_created' } });
    expect(await count('github_installations')).toBe(before.installs + 1);
  });

  it('CONCURRENCY: five simultaneous created events for one installation create exactly one tenant', async () => {
    const events = Array.from({ length: 5 }, (_, i) => signed('installation', `pg-race-${i}`, created(4003)));
    const results = await Promise.all(events.map((e) => handleWebhook(e, deps)));

    const creations = results.filter((r) => r.status === 202 && r.detail && 'kind' in r.detail && r.detail.kind === 'tenant_created');
    expect(creations).toHaveLength(1);
    expect(Number((await pool.query('SELECT count(*) AS n FROM github_installations WHERE installation_id = 4003')).rows[0]?.n)).toBe(1);
    expect(Number((await pool.query('SELECT count(*) AS n FROM tenants t JOIN github_installations g ON g.tenant_id = t.id WHERE g.installation_id = 4003')).rows[0]?.n)).toBe(1);
  });

  it('CONCURRENCY: five simultaneous copies of one delivery are processed exactly once (GH-008)', async () => {
    const req = signed('installation', 'pg-dup-1', created(4004));
    const results = await Promise.all(Array.from({ length: 5 }, () => handleWebhook(req, deps)));
    const accepted = results.filter((r) => r.status === 202);
    const duplicates = results.filter((r) => r.status === 200);
    expect(accepted).toHaveLength(1);
    expect(duplicates).toHaveLength(4);
    expect(Number((await pool.query("SELECT count(*) AS n FROM audit_events WHERE event = 'installation.created' AND detail->>'installationId' = '4004'")).rows[0]?.n)).toBe(1);
  });

  it('GH-003 / GH-014: repository access is enforced from the stored inventory', async () => {
    await handleWebhook(signed('installation', 'pg-repo-1', created(4005, [{ id: 88, full_name: 'o/allowed' }])), deps);
    const tenant = (await pool.query<{ tenant_id: string }>('SELECT tenant_id FROM github_installations WHERE installation_id = 4005')).rows[0]!.tenant_id;
    const ctx = { tenantId: tenant, installationId: 4005, actor: { type: 'app' as const, id: 'test' } };

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

  it('TEN-005: a pull request queues a job for the stored tenant, and the job is in the same transaction as its claim', async () => {
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
    const job = (await pool.query("SELECT tenant_id FROM jobs WHERE delivery_id = 'pg-pr-1'")).rows[0] as { tenant_id: string };
    const owner = (await pool.query('SELECT tenant_id FROM github_installations WHERE installation_id = 4006')).rows[0] as { tenant_id: string };
    expect(job.tenant_id).toBe(owner.tenant_id);
  });
});
