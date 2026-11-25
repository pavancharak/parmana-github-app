import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeWebhookSignature } from '@parmana/github-client';
import { buildServer } from '../src/server.js';
import { MemoryUnitOfWork } from '../src/memory.js';
import type { FastifyInstance } from 'fastify';

const SECRET = 'test-webhook-secret';
const payload = {
  action: 'created',
  installation: { id: 1001, account: { id: 555 }, repository_selection: 'all' },
  repositories: [],
};
const rawBody = Buffer.from(JSON.stringify(payload));

let app: FastifyInstance;
let uow: MemoryUnitOfWork;

beforeEach(() => {
  uow = new MemoryUnitOfWork();
  app = buildServer({ secret: SECRET, uow, newTenantId: () => 'tenant-1' });
});

afterEach(async () => {
  await app.close();
});

const post = (headers: Record<string, string>, body: Buffer = rawBody) =>
  app.inject({
    method: 'POST',
    url: '/webhooks/github',
    headers: { 'content-type': 'application/json', ...headers },
    payload: body,
  });

describe('POST /webhooks/github (GH-006, GH-007, GH-008)', () => {
  it('GH-006: a validly signed delivery is accepted and the body is verified byte for byte', async () => {
    const res = await post({
      'x-hub-signature-256': computeWebhookSignature(SECRET, rawBody),
      'x-github-event': 'installation',
      'x-github-delivery': 'http-1',
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ outcome: 'accepted' });
    expect(uow.state.installations.get(1001)?.tenantId).toBe('tenant-1');
  });

  it('GH-007: an invalid signature returns 401 and nothing is written', async () => {
    const res = await post({
      'x-hub-signature-256': 'sha256=' + '0'.repeat(64),
      'x-github-event': 'installation',
      'x-github-delivery': 'http-2',
    });
    expect(res.statusCode).toBe(401);
    expect(uow.state.installations.size).toBe(0);
  });

  it('GH-007: a body altered after signing is rejected', async () => {
    const sig = computeWebhookSignature(SECRET, rawBody);
    const altered = Buffer.from(JSON.stringify({ ...payload, action: 'deleted' }));
    const res = await post(
      { 'x-hub-signature-256': sig, 'x-github-event': 'installation', 'x-github-delivery': 'http-3' },
      altered,
    );
    expect(res.statusCode).toBe(401);
  });

  it('GH-008: a replayed delivery returns 200 duplicate', async () => {
    const headers = {
      'x-hub-signature-256': computeWebhookSignature(SECRET, rawBody),
      'x-github-event': 'installation',
      'x-github-delivery': 'http-4',
    };
    await post(headers);
    const replay = await post(headers);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ outcome: 'duplicate' });
  });

  it('returns only outcome codes, never tenant IDs or internal detail', async () => {
    const res = await post({
      'x-hub-signature-256': computeWebhookSignature(SECRET, rawBody),
      'x-github-event': 'installation',
      'x-github-delivery': 'http-5',
    });
    expect(res.body).not.toContain('tenant-1');
  });

  it('health endpoint responds', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
