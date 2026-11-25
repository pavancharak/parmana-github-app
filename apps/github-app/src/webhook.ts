import { verifyWebhookSignature } from '@parmana/github-client';
import {
  applyInstallationEvent,
  applyInstallationRepositoriesEvent,
  UnknownInstallationError,
  type InstallationOutcome,
  type InstallationPayload,
  type InstallationRepositoriesPayload,
} from './installation.js';
import type { UnitOfWork } from './stores.js';

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
  readonly uow: UnitOfWork;
  readonly newTenantId: () => string;
}

export type WebhookResult =
  | { status: 401; reason: 'bad_signature' }
  | { status: 400; reason: 'missing_delivery_id' | 'malformed_payload' | 'unknown_installation' | 'installation_not_active' }
  | { status: 200; outcome: 'duplicate' }
  | { status: 202; outcome: 'accepted'; detail: InstallationOutcome | { kind: 'enqueued' | 'ignored_event'; event: string } };

class InstallationNotActiveError extends Error {
  readonly code = 'installation_not_active';
  constructor() {
    super('installation is not active');
    this.name = 'InstallationNotActiveError';
  }
}

/**
 * Handles one GitHub webhook delivery (docs/architecture/GITHUB-INTEGRATION.md §4).
 *
 * 1. Verify the signature before reading anything else (GH-007, T-01).
 * 2. Parse and validate the payload before opening a transaction.
 * 3. Inside one transaction: claim the delivery ID, apply the event and
 *    enqueue any job. If any step fails, the claim rolls back too, so a GitHub
 *    redelivery is processed as new (GH-008). A committed claim means the
 *    delivery is never processed twice (GH-008, T-02).
 * 4. Tenant for a pull request is resolved from the stored installation, never the payload (TEN-005).
 */
export async function handleWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResult> {
  if (!verifyWebhookSignature(deps.secret, req.rawBody, req.headers.signature256)) {
    return { status: 401, reason: 'bad_signature' };
  }

  const deliveryId = req.headers.deliveryId;
  if (deliveryId === undefined || deliveryId.length === 0) {
    return { status: 400, reason: 'missing_delivery_id' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(req.rawBody));
  } catch {
    return { status: 400, reason: 'malformed_payload' };
  }

  const event = req.headers.event ?? '';
  // Validate before opening the transaction. A malformed delivery must not
  // commit a claim, or a corrected redelivery would look like a duplicate.
  const parsed = parseEvent(event, payload);
  if (parsed === 'malformed') {
    return { status: 400, reason: 'malformed_payload' };
  }

  try {
    return await deps.uow.run(async (tx): Promise<WebhookResult> => {
      const firstTime = await tx.claimDelivery(deliveryId);
      if (!firstTime) {
        return { status: 200, outcome: 'duplicate' };
      }

      switch (parsed.kind) {
        case 'installation': {
          const outcome = await applyInstallationEvent(parsed.payload, tx, deps.newTenantId);
          return { status: 202, outcome: 'accepted', detail: outcome };
        }
        case 'installation_repositories': {
          const outcome = await applyInstallationRepositoriesEvent(parsed.payload, tx);
          return { status: 202, outcome: 'accepted', detail: outcome };
        }
        case 'pull_request': {
          const installation = await tx.findInstallation(parsed.payload.installation.id);
          if (!installation) throw new UnknownInstallationError(parsed.payload.installation.id);
          if (installation.status !== 'active') throw new InstallationNotActiveError();
          await tx.enqueueJob({ tenantId: installation.tenantId, deliveryId, kind: 'pull_request', payload: parsed.payload });
          return { status: 202, outcome: 'accepted', detail: { kind: 'enqueued', event: 'pull_request' } };
        }
        case 'ignored':
          return { status: 202, outcome: 'accepted', detail: { kind: 'ignored_event', event } };
      }
    });
  } catch (err) {
    if (err instanceof UnknownInstallationError) return { status: 400, reason: 'unknown_installation' };
    if (err instanceof InstallationNotActiveError) return { status: 400, reason: 'installation_not_active' };
    throw err;
  }
}

type ParsedEvent =
  | { kind: 'installation'; payload: InstallationPayload }
  | { kind: 'installation_repositories'; payload: InstallationRepositoriesPayload }
  | { kind: 'pull_request'; payload: { installation: { id: number } } }
  | { kind: 'ignored' }
  | 'malformed';

function parseEvent(event: string, payload: unknown): ParsedEvent {
  if (event === 'installation') return isInstallationPayload(payload) ? { kind: 'installation', payload } : 'malformed';
  if (event === 'installation_repositories') {
    return isInstallationRepositoriesPayload(payload) ? { kind: 'installation_repositories', payload } : 'malformed';
  }
  if (event === 'pull_request') return isPullRequestPayload(payload) ? { kind: 'pull_request', payload } : 'malformed';
  return { kind: 'ignored' };
}

// ---- payload validation (shape only; semantic checks happen in the reducers) ----

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

function hasInstallation(v: Obj): boolean {
  if (typeof v.action !== 'string') return false;
  if (!isObj(v.installation)) return false;
  const inst = v.installation;
  return isNum(inst.id) && isObj(inst.account) && isNum(inst.account.id) && typeof inst.repository_selection === 'string';
}

function isInstallationPayload(v: unknown): v is InstallationPayload {
  return isObj(v) && hasInstallation(v);
}

function isInstallationRepositoriesPayload(v: unknown): v is InstallationRepositoriesPayload {
  return isObj(v) && hasInstallation(v);
}

function isPullRequestPayload(v: unknown): v is { installation: { id: number } } {
  return isObj(v) && isObj(v.installation) && isNum(v.installation.id);
}
