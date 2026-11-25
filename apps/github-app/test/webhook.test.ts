import { describe, expect, it, beforeEach } from 'vitest';
import { computeWebhookSignature } from '@parmana/github-client';
import { handleWebhook, type WebhookDeps, type WebhookRequest } from '../src/webhook.js';
import {
  MemoryAuditStore,
  MemoryDeliveryStore,
  MemoryInstallationStore,
  MemoryJobQueue,
} from '../src/memory.js';

const SECRET = 'test-webhook-secret';
const enc = new TextEncoder();

function signed(event: string, deliveryId: string, payload: unknown): WebhookRequest {
  const rawBody = enc.encode(JSON.stringify(payload));
  return {
    rawBody,
    headers: {
      signature256: computeWebhookSignature(SECRET, rawBody),
      event,
      deliveryId,
    },
  };
}

const installationPayload = (action: string, id = 1001) => ({
  action,
  installation: { id, account: { id: 555 } },
});

const prPayload = (installationId = 1001) => ({
  action: 'opened',
  number: 42,
  installation: { id: installationId, account: { id: 555 } },
  pull_request: { head: { sha: 'a'.repeat(40) } },
});

let deps: WebhookDeps;
let queue: MemoryJobQueue;
let installations: MemoryInstallationStore;
let deliveries: MemoryDeliveryStore;
let audit: MemoryAuditStore;
let tenantCounter: number;

beforeEach(() => {
  queue = new MemoryJobQueue();
  installations = new MemoryInstallationStore();
  deliveries = new MemoryDeliveryStore();
  audit = new MemoryAuditStore();
  tenantCounter = 0;
  deps = {
    secret: SECRET,
    installations,
    audit,
    deliveries,
    queue,
    newTenantId: () => `tenant-${++tenantCounter}`,
  };
});

describe('webhook receipt (GH-006 to GH-008)', () => {
  it('GH-007: rejects an invalid signature before reading anything else', async () => {
    const req = signed('installation', 'd-1', installationPayload('created'));
    const bad = { ...req, headers: { ...req.headers, signature256: 'sha256=' + '0'.repeat(64) } };
    const res = await handleWebhook(bad, deps);
    expect(res).toEqual({ status: 401, reason: 'bad_signature' });
    expect(await installations.findByInstallationId(1001)).toBeUndefined();
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

  it('GH-008: a replayed delivery returns duplicate and does not run twice', async () => {
    const req = signed('installation', 'd-3', installationPayload('created'));
    const first = await handleWebhook(req, deps);
    const second = await handleWebhook(req, deps);

    expect(first).toMatchObject({ status: 202, outcome: 'accepted' });
    expect(second).toEqual({ status: 200, outcome: 'duplicate' });
    expect(await installations.findByInstallationId(1001)).toBeDefined();
    expect(audit.events.filter((e) => e.event === 'installation.created')).toHaveLength(1);
  });

  it('GH-008: a delivery that failed before being marked processed can be retried', async () => {
    const req = signed('installation', 'd-4', installationPayload('created'));
    const brokenAudit = {
      append: async () => {
        throw new Error('audit down');
      },
    };
    // The failure happens before markProcessed, so the delivery stays unprocessed.
    await expect(handleWebhook(req, { ...deps, audit: brokenAudit })).rejects.toThrow('audit down');
    expect(await deliveries.isProcessed('d-4')).toBe(false);

    const retry = await handleWebhook(req, deps);
    expect(retry).toMatchObject({ status: 202, outcome: 'accepted' });
    expect(await deliveries.isProcessed('d-4')).toBe(true);
  });
});

describe('installation lifecycle (GH-001, GH-002, GH-004, GH-005, FR-01)', () => {
  it('GH-001: a new installation creates exactly one tenant', async () => {
    const res = await handleWebhook(signed('installation', 'd-10', installationPayload('created')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'tenant_created', tenantId: 'tenant-1' } });
    const row = await installations.findByInstallationId(1001);
    expect(row).toMatchObject({ tenantId: 'tenant-1', status: 'active', installationId: 1001 });
  });

  it('GH-002: a repeated created event for the same installation does not create a second tenant', async () => {
    await handleWebhook(signed('installation', 'd-11', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-12', installationPayload('created')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'already_exists', tenantId: 'tenant-1' } });
    expect(tenantCounter).toBe(2); // a candidate ID was generated and discarded
    expect(audit.events.some((e) => e.event === 'installation.created.duplicate')).toBe(true);
  });

  it('GH-004: a suspended installation is marked suspended and audited', async () => {
    await handleWebhook(signed('installation', 'd-20', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-21', installationPayload('suspend')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'status_changed', status: 'suspended' } });
    expect((await installations.findByInstallationId(1001))?.status).toBe('suspended');
  });

  it('GH-004: a suspended installation stops pull request evaluation', async () => {
    await handleWebhook(signed('installation', 'd-30', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-31', installationPayload('suspend')), deps);
    const res = await handleWebhook(signed('pull_request', 'd-32', prPayload()), deps);
    expect(res).toEqual({ status: 400, reason: 'unknown_installation' });
    expect(queue.jobs).toHaveLength(0);
  });

  it('unsuspend restores an active installation', async () => {
    await handleWebhook(signed('installation', 'd-40', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-41', installationPayload('suspend')), deps);
    await handleWebhook(signed('installation', 'd-42', installationPayload('unsuspend')), deps);
    expect((await installations.findByInstallationId(1001))?.status).toBe('active');
  });

  it('GH-005: a deleted installation is removed and cannot be reactivated', async () => {
    await handleWebhook(signed('installation', 'd-50', installationPayload('created')), deps);
    await handleWebhook(signed('installation', 'd-51', installationPayload('deleted')), deps);
    const reactivate = await handleWebhook(signed('installation', 'd-52', installationPayload('unsuspend')), deps);
    expect(reactivate).toMatchObject({ status: 202, detail: { kind: 'unchanged', status: 'removed' } });
    expect((await installations.findByInstallationId(1001))?.status).toBe('removed');
  });

  it('FR-01.6: lifecycle events for an unknown installation are rejected', async () => {
    const res = await handleWebhook(signed('installation', 'd-60', installationPayload('suspend', 9999)), deps);
    expect(res).toEqual({ status: 400, reason: 'unknown_installation' });
  });

  it('ignores unknown installation actions without changing state', async () => {
    await handleWebhook(signed('installation', 'd-70', installationPayload('created')), deps);
    const res = await handleWebhook(signed('installation', 'd-71', installationPayload('new_permissions_accepted')), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'ignored', action: 'new_permissions_accepted' } });
    expect((await installations.findByInstallationId(1001))?.status).toBe('active');
  });
});

describe('pull request events (GH-009, tenant resolution)', () => {
  it('GH-009: an opened PR for an active installation is enqueued for its tenant', async () => {
    await handleWebhook(signed('installation', 'd-80', installationPayload('created')), deps);
    const res = await handleWebhook(signed('pull_request', 'd-81', prPayload()), deps);
    expect(res).toMatchObject({ status: 202, detail: { kind: 'enqueued', event: 'pull_request' } });
    expect(queue.jobs).toEqual([
      expect.objectContaining({ tenantId: 'tenant-1', deliveryId: 'd-81', kind: 'pull_request' }),
    ]);
  });

  it('TEN-008 / TEN-005: a PR for an unknown installation is rejected and never enqueued', async () => {
    const res = await handleWebhook(signed('pull_request', 'd-82', prPayload(4242)), deps);
    expect(res).toEqual({ status: 400, reason: 'unknown_installation' });
    expect(queue.jobs).toHaveLength(0);
  });

  it('TEN-005: the tenant comes from the stored installation, not from the payload', async () => {
    await handleWebhook(signed('installation', 'd-83', installationPayload('created')), deps);
    const forged = { ...prPayload(), tenant_id: 'tenant-attacker' };
    await handleWebhook(signed('pull_request', 'd-84', forged), deps);
    expect(queue.jobs[0]?.tenantId).toBe('tenant-1');
  });
});
