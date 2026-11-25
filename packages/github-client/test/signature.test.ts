import { describe, expect, it } from 'vitest';
import { computeWebhookSignature, verifyWebhookSignature } from '../src/index.js';

const secret = 'test-webhook-secret';
const body = new TextEncoder().encode('{"action":"created"}');

describe('verifyWebhookSignature (GH-006, GH-007, SEC-WH-01)', () => {
  it('accepts a correctly signed body', () => {
    const sig = computeWebhookSignature(secret, body);
    expect(verifyWebhookSignature(secret, body, sig)).toBe(true);
  });

  it('rejects a body altered after signing', () => {
    const sig = computeWebhookSignature(secret, body);
    const tampered = new TextEncoder().encode('{"action":"deleted"}');
    expect(verifyWebhookSignature(secret, tampered, sig)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    const sig = computeWebhookSignature('other-secret', body);
    expect(verifyWebhookSignature(secret, body, sig)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifyWebhookSignature(secret, body, undefined)).toBe(false);
  });

  it('rejects a header with the wrong algorithm prefix', () => {
    const hex = computeWebhookSignature(secret, body).slice('sha256='.length);
    expect(verifyWebhookSignature(secret, body, `sha1=${hex}`)).toBe(false);
  });

  it('rejects a header of the wrong length without throwing', () => {
    expect(verifyWebhookSignature(secret, body, 'sha256=abc')).toBe(false);
  });

  it('fails closed when the secret is empty', () => {
    const sig = computeWebhookSignature('', body);
    expect(verifyWebhookSignature('', body, sig)).toBe(false);
  });
});
