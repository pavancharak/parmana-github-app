import { describe, expect, it, beforeEach } from 'vitest';
import { computeWebhookSignature } from '@parmana/github-client';
import { handleWebhook, type WebhookDeps, type WebhookRequest } from '../src/webhook.js';
import { MemoryUnitOfWork } from '../src/memory.js';
import type { Tx, UnitOfWork } from '../src/stores.js';

const SECRET = 'test-webhook-secret';
const enc = new TextEncoder();

function signed(event: string, deliveryId: string, payload: unknown): WebhookRequest {
  const rawBody = enc.encode(JSON.stringify(payload));
  return {
    rawBody,
    headers: { signature256: computeWebhookSignature(SECRET, rawBody), event, deliveryId },
  };
}

const installationPayload = (action: string, id = 1001, repos: Array<{ id: number; full_name: string }> = []) => ({
  action,
  installation: { id, account: { id: 555 }, repository_selection: 'selected' },
  repositories: repos,
});

const reposPayload = (
  action: 'added' | 'removed',
  repos: Array<{ id: number; full_name: string }>,
  id = 1001,
) => ({
  action,
  installation: { id, account: { id: 555 }, repository_selection: 'selected' },
  repositories_added: action === 'added' ? repos : [],
  repositories_removed: action === 'removed' ? repos.map((r) => ({ id: r.id })) : [],
});

const prPayload = (installationId = 1001) => ({
  action: 'opened',
  number: 42,
  installation: { id: installationId, account: { id: 555 }, repository_selection: 'selected' },
  pull_request: { head: { sha: 'a'.repeat(40) } },
});

/** Wraps a unit of work so that writing audit events fails. Simulates a crash after other writes. */
function withAuditFailure(inner: UnitOfWork): UnitOfWork {
  return {
    run: (fn) =>
      inner.run((tx: Tx) =>
        fn(
          new Proxy(tx, {
            get(target, prop, receiver) {
              if (prop === 'appendAudit') {
                return async () => {
                  throw new Error('audit down');
                };
              }
              return Reflect.get(target, prop, receiver) as unknown;
            },
          }),
        ),
      ),
  };
}

let uow: MemoryUnitOfWork;
let deps: WebhookDeps;
let tenantCounter: number;

beforeEach(() => {
  uow = new MemoryUnitOfWork();
  tenantCounter = 0;
  deps = { secret: SECRET, uow, newTenantId: () => `tenant-${++tenantCounter}` };
});

const installationRow = (id = 1001) => uow.state.installations.get(id);

describe('webhook receipt (GH-006 to GH-008)', () => {
  it('GH-007: rejects an invalid signature and changes nothing', async () => {
    const req = signed('installation', 'd-1', installationPayload('created'));
    const bad = { ...req, headers: { ...req.headers, signature256: 'sha256=' + '0'.repeat(64) } };
    expect(await handleWebhook(bad, deps)).toEqual({ status: 401, reason: 'bad_signature' });
    expect(installationRow()).toBeUndefined();
    expect(uow.state.deliveries.size).toBe(0);
  });

  it('rejects a missing delivery ID', async () => {
    const req = signed('installation', '', installationPayload('created'));
    const res = await handleWebhook({ ...req, headers: { ...req.headers, deliveryId: undefined } }, deps);
    expect(res).toEqual({ status: 400, reason: 'missing_delivery_id' });
  });

  it('rejects a malformed JSON body with a valid signature', async () => {
    const rawBody = enc.encode('{not json');
    const res = await handleWebhook(
      { rawBody, headers: { signature256: computeWebhookSignature(SECRET, rawBody), event: 'ping', deliveryId: 'd-2' } },
      deps,
    );
    expect(res).toEqual({ status: 400, reason: 'malformed_payload' });
  });

  it('rejects an installation payload missing required fields', async () => {
    const res = await handleWebhook(signed('installation', 'd-3', { action: 'created' }), deps);
    expect(res).toEqual({ status: 400, reason: 'malformed_payload' });
    expect(uow.state.deliveries.has('d-3')).toBe(false);
  });

  it('GH-008: a replayed delivery returns duplicate and does not run twice', async () => {
    const req = signed('installation', 'd-4', installationPayload('created'));
    const first = await handleWebhook(req, deps);
    const second = await handleWebhook(req, deps);
    expect(first).toMatchObject({ status: 202, outcome: 'accepted' });
    expect(second).toEqual({ status: 200, outcome: 'duplicate' });
    expect(uow.state.audit.filter((e) => e.event === 'installation.created')).toHaveLength(1);
    expect(tenantCounter).toBe(1);
  });

  it('GH-008: a failed delivery leaves no partial state and can be retried', async () => {
    const req = signed('installation', 'd-5', installationPayload('created', 1001, [{ id: 7, full_name: 'o/r' }]));
    await expect(handleWebhook(req, { ...deps, uow: withAuditFailure(uow) })).rejects.toThrow('audit down');

    // Nothing committed: no tenant, no installation, no repositories, no claim.
    expect(installationRow()).toBeUndefined();
    expect(uow.state.repositories.size).toBe(0);
    expect(uow.state.deliveries.has('d-5')).toBe(false);

    const retry = await handleWebhook(req, deps);
    // The failed attempt used tenant-1 but never committed it, so the retry gets tenant-2.
    // Only the committed tenant exists.
    expect(retry).toMatchObject({ status: 202, detail: { kind: 'tenant_created', tenantId: 'tenant-2' } });
    expect(installationRow()?.tenantId).toBe('tenant-2');
    expect(uow.state.installations.size).toBe(1);
    expect(uow.state.deliveries.has('d-5')).toBe(true);
  });
});

describe('installation lifecycle (GH-001, GH-002, GH-004, GH-005, FR-01)', () => {
  it('GH-001: a new installation creates exactly one tenant and activates its repositories', async () => {
    const res = await handleWebhook(
      signed('installation', 'd-10', installationPayload('created', 1001, [{ id: 7, full_name: 'o/r' }])),
      deps,
    );
    expect(res).toMatchObject({ status: 202, detail: { kind: 'tenant_created', tenantId: 'tenant-1', repositories: 1 } });
    expect(installationRow()).toMatchObject({ tenantId: 'tenant-1', status: 'active', installationId: 1001 });
  });

  it('GH-002: a repeated created event does not create a second tenant', async () => {
    await handleWebhook(signed('installation', 'd-11', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-12', installationPayload('created')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'already_exists', tenantId: 'tenant-1' } });
    expect(tenantCounter).toBe(1);
    expect(uow.state.audit.some((e) => e.event === 'installation.created.duplicate')).toBe(true);
  });

  it('GH-004: a suspended installation is marked suspended and audited', async () => {
    await handleWebhook(signed('installation', 'd-20', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-21', installationPayload('suspend')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'status_changed', status: 'suspended' } });
    expect(installationRow()?.status).toBe('suspended');
  });

  it('GH-004: a suspended installation stops pull request evaluation', async () => {
    await handleWebhook(signed('installation', 'd-30', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-31', installationPayload('suspend')), deps);
    const res = await handleWebhook(signed('pull_request', 'd-32', prPayload()), deps);
    expect(res).toEqual({ status: 400, reason: 'installation_not_active' });
    expect(uow.state.jobs).toHaveLength(0);
  });

  it('unsuspend restores an active installation', async () => {
    await handleWebhook(signed('installation', 'd-40', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-41', installationPayload('suspend')), deps);
    await handleWebhook(signed('installation', 'd-42', installationPayload('unsuspend')), deps);
    expect(installationRow()?.status).toBe('active');
  });

  it('GH-005: a deleted installation is removed and cannot be reactivated', async () => {
    await handleWebhook(signed('installation', 'd-50', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-51', installationPayload('deleted')), deps);
    const res = await handleWebhook(signed('installation', 'd-52', installationPayload('unsuspend')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'unchanged', status: 'removed' } });
    expect(installationRow()?.status).toBe('removed');
  });

  it('FR-01.6: lifecycle events for an unknown installation are rejected and not recorded', async () => {
    const res = await handleWebhook(signed('installation', 'd-60', installationPayload('suspend', 9999)), deps);
    expect(res).toEqual({ status: 400, reason: 'unknown_installation' });
    expect(uow.state.deliveries.has('d-60')).toBe(false);
  });

  it('ignores unknown installation actions without changing state', async () => {
    await handleWebhook(signed('installation', 'd-70', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-71', installationPayload('new_permissions_accepted')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'ignored', action: 'new_permissions_accepted' } });
    expect(installationRow()?.status).toBe('active');
  });
});

describe('repository selection (GH-003, GH-014)', () => {
  it('GH-003: only repositories in the installation selection are accessible', async () => {
    await handleWebhook(
      signed('installation', 'd-100', installationPayload('created', 1001, [{ id: 7, full_name: 'o/allowed' }])),
      deps,
    );
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-1', 7))).toBe(true);
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-1', 8))).toBe(false);
  });

  it('GH-003: repositories added and removed by installation_repositories are reconciled', async () => {
    await handleWebhook(signed('installation', 'd-110', installationPayload('created')), deps);
    await handleWebhook(signed('installation_repositories', 'd-111', reposPayload('added', [{ id: 9, full_name: 'o/new' }])), deps);
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-1', 9))).toBe(true);

    const removed = await handleWebhook(
      signed('installation_repositories', 'd-112', reposPayload('removed', [{ id: 9, full_name: 'o/new' }])),
      deps,
    );
    expect(removed).toMatchObject({ status: 202, detail: { kind: 'repositories_reconciled', removed: 1 } });
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-1', 9))).toBe(false);
  });

  it('TEN-005: repository inventory is scoped to the tenant that owns the installation', async () => {
    await handleWebhook(
      signed('installation', 'd-120', installationPayload('created', 1001, [{ id: 7, full_name: 'o/r' }])),
      deps,
    );
    await handleWebhook(signed('installation', 'd-121', installationPayload('created', 2002, [{ id: 7, full_name: 'other/r' }])), deps);
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-1', 7))).toBe(true);
    expect(await uow.run((tx) => tx.isRepositoryActive('tenant-unknown', 7))).toBe(false);
  });
});

describe('pull request events (GH-009, TEN-005, TEN-008)', () => {
  it('GH-009: an opened PR for an active installation is enqueued for its tenant', async () => {
    await handleWebhook(signed('installation', 'd-80', installationPayload('created')), deps);
    const res = await handleWebhook(signed('pull_request', 'd-81', prPayload()), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'enqueued', event: 'pull_request' } });
    expect(uow.state.jobs).toEqual([expect.objectContaining({ tenantId: 'tenant-1', deliveryId: 'd-81', kind: 'pull_request' })]);
  });

  it('TEN-008: a PR for an unknown installation is rejected and never enqueued', async () => {
    const res = await handleWebhook(signed('pull_request', 'd-82', prPayload(4242)), deps);
    expect(res).toEqual({ status: 400, reason: 'unknown_installation' });
    expect(uow.state.jobs).toHaveLength(0);
  });

  it('TEN-005: the tenant comes from the stored installation, not from the payload', async () => {
    await handleWebhook(signed('installation', 'd-83', installationPayload('created')), deps);
    const forged = { ...prPayload(), tenant_id: 'tenant-attacker' };
    await handleWebhook(signed('pull_request', 'd-84', forged), deps);
    expect(uow.state.jobs[0]?.tenantId).toBe('tenant-1');
  });
});
