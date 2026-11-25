import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Computes the GitHub webhook signature header value for a raw request body.
 * Format: `sha256=<hex>` (GitHub's X-Hub-Signature-256).
 */
export function computeWebhookSignature(secret: string, rawBody: Uint8Array): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Verifies an X-Hub-Signature-256 header against the raw body.
 *
 * Fails closed: an empty secret, a missing header, a malformed header or any
 * mismatch returns false. The comparison is constant-time (threat T-01).
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: Uint8Array,
  signatureHeader: string | undefined,
): boolean {
  if (secret.length === 0 || signatureHeader === undefined) {
    return false;
  }
  const expected = Buffer.from(computeWebhookSignature(secret, rawBody), 'utf8');
  const received = Buffer.from(signatureHeader, 'utf8');
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
