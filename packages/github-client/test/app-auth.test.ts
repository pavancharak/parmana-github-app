import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createAppJwt,
  GitHubApiError,
  InstallationTokenCache,
  mintInstallationToken,
  type FetchLike,
  type HttpResponse,
} from '../src/index.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const response = (status: number, body: unknown): HttpResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('createAppJwt', () => {
  it('produces an RS256 JWT that verifies with the App key and has GitHub-compliant times', () => {
    const now = 1_800_000_000;
    const jwt = createAppJwt('12345', privatePem, now);
    const [h, p, s] = jwt.split('.') as [string, string, string];
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());

    expect(header).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(payload.iss).toBe('12345');
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(600);
    expect(verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicPem, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

describe('installation tokens (FR-01: never persisted as plaintext)', () => {
  it('mints a token using a JWT and reads expires_at', async () => {
    const calls: Array<{ url: string; auth: string }> = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, auth: init.headers.Authorization ?? '' });
      return response(201, { token: 'ghs_test', expires_at: '2030-01-01T00:00:00Z' });
    };
    const minted = await mintInstallationToken(
      { fetch: fetchImpl, appId: '12345', privateKeyPem: privatePem, now: () => 1_800_000_000_000 },
      777,
    );
    expect(minted.token).toBe('ghs_test');
    expect(minted.expiresAtMs).toBe(Date.parse('2030-01-01T00:00:00Z'));
    expect(calls[0]?.url).toBe('https://api.github.com/app/installations/777/access_tokens');
    expect(calls[0]?.auth.startsWith('Bearer ')).toBe(true);
  });

  it('error messages carry the status only, never the response body', async () => {
    const fetchImpl: FetchLike = async () => response(401, { message: 'secret echo ghs_leaked' });
    const err = await mintInstallationToken(
      { fetch: fetchImpl, appId: '1', privateKeyPem: privatePem, now: () => 0 },
      1,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubApiError);
    expect(String((err as Error).message)).not.toContain('ghs_leaked');
  });

  it('cache reuses a token until it nears expiry, then refreshes it', async () => {
    let clock = 0;
    let mints = 0;
    const cache = new InstallationTokenCache(
      async () => {
        mints++;
        return { token: `t${mints}`, expiresAtMs: clock + 60 * 60_000 };
      },
      () => clock,
    );

    expect(await cache.get(1)).toBe('t1');
    expect(await cache.get(1)).toBe('t1');
    clock = 56 * 60_000; // within the 5-minute refresh window
    expect(await cache.get(1)).toBe('t2');
    expect(mints).toBe(2);
  });

  it('cache keeps tokens per installation and holds them only in memory', async () => {
    const cache = new InstallationTokenCache(async (id) => ({ token: `tok-${id}`, expiresAtMs: Date.now() + 3_600_000 }), () => Date.now());
    expect(await cache.get(1)).toBe('tok-1');
    expect(await cache.get(2)).toBe('tok-2');
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
