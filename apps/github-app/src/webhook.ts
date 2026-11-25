import { verifyWebhookSignature } from '@parmana/github-client';
import { applyInstallationEvent, type InstallationOutcome, type InstallationPayload } from './installation.js';
import type { AuditStore, DeliveryStore, InstallationStore, JobQueue } from './stores.js';

export interface WebhookRequest {
  readonly rawBody: Uint8Array;
  readonly headers: {
    readonly signature256: string | undefined;
    readonly event: string | undefined;
    readonly deliveryId: string | undefined;
  };
}

export interface WebhookDeps {
  readonly secret: string;
  readonly installations: InstallationStore;
  readonly audit: AuditStore;
  readonly deliveries: DeliveryStore;
  readonly queue: JobQueue;
  readonly newTenantId: () => string;
}

export type WebhookResult =
  | { status: 401; reason: 'bad_signature' }
  | { status: 400; reason: 'missing_delivery_id' | 'malformed_payload' | 'unknown_installation' }
  | { status: 200; outcome: 'duplicate' }
  | { status: 202; outcome: 'accepted'; detail: InstallationOutcome | { kind: 'enqueued' | 'ignored_event'; event: string } };

/**
 * Handles one GitHub webhook delivery (docs/architecture/GITHUB-INTEGRATION.md §4).
 *
 * Order matters:
 * 1. Verify the signature before reading anything else (GH-007, T-01).
 * 2. Reject duplicates of a delivery that was already processed (GH-008, T-02).
 * 3. Apply the event. The delivery is marked processed only after success,
 *    so a failed attempt can be retried by GitHub redelivery.
 */
export async function handleWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResult> {
  if (!verifyWebhookSignature(deps.secret, req.rawBody, req.headers.signature256)) {
    return { status: 401, reason: 'bad_signature' };
  }

  const deliveryId = req.headers.deliveryId;
  if (deliveryId === undefined || deliveryId.length === 0) {
    return { status: 400, reason: 'missing_delivery_id' };
  }

  if (await deps.deliveries.isProcessed(deliveryId)) {
    return { status: 200, outcome: 'duplicate' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(req.rawBody));
  } catch {
    return { status: 400, reason: 'malformed_payload' };
  }

  if (req.headers.event === 'installation') {
    if (!isInstallationPayload(payload)) {
      return { status: 400, reason: 'malformed_payload' };
    }
    let outcome: InstallationOutcome;
    try {
      outcome = await applyInstallationEvent(payload, deps);
    } catch (err) {
      if (err instanceof Error && err.name === 'UnknownInstallationError') {
        return { status: 400, reason: 'unknown_installation' };
      }
      throw err;
    }
    await deps.deliveries.markProcessed(deliveryId);
    return { status: 202, outcome: 'accepted', detail: outcome };
  }

  if (req.headers.event === 'pull_request') {
    const tenantId = await tenantForPayload(payload, deps);
    if (tenantId === undefined) {
      return { status: 400, reason: 'unknown_installation' };
    }
    await deps.queue.enqueue({ tenantId, deliveryId, kind: 'pull_request', payload });
    await deps.deliveries.markProcessed(deliveryId);
    return { status: 202, outcome: 'accepted', detail: { kind: 'enqueued', event: 'pull_request' } };
  }

  await deps.deliveries.markProcessed(deliveryId);
  return { status: 202, outcome: 'accepted', detail: { kind: 'ignored_event', event: req.headers.event ?? '' } };
}

function isInstallationPayload(value: unknown): value is InstallationPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.action !== 'string') return false;
  const inst = v.installation as Record<string, unknown> | undefined;
  if (!inst || typeof inst.id !== 'number') return false;
  const account = inst.account as Record<string, unknown> | undefined;
  return !!account && typeof account.id === 'number';
}

/**
 * Resolves the tenant for a pull request event from the installation ID in the
 * payload. The tenant is never taken from the payload itself (FR-02, TEN-005).
 */
async function tenantForPayload(payload: unknown, deps: WebhookDeps): Promise<string | undefined> {
  const installationId = (payload as { installation?: { id?: unknown } }).installation?.id;
  if (typeof installationId !== 'number') return undefined;
  const row = await deps.installations.findByInstallationId(installationId);
  if (!row || row.status !== 'active') return undefined;
  return row.tenantId;
}
