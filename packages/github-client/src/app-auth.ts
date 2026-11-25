import { createSign } from 'node:crypto';

/**
 * GitHub App authentication. An App JWT (RS256, valid 10 minutes) exchanges
 * for a short-lived installation access token.
 *
 * Storage rule (FR-01 acceptance): installation tokens are kept only in process
 * memory. They are never written to the database, logs or audit events, and this
 * module has no storage port.
 */

const b64url = (input: string | Buffer): string => Buffer.from(input).toString('base64url');

export function createAppJwt(appId: string, privateKeyPem: string, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  // iat is backdated 60 s for clock skew; exp is at most 10 minutes after iat (GitHub limit).
  const payload = b64url(JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId }));
  const data = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256').update(data).sign(privateKeyPem);
  return `${data}.${b64url(signature)}`;
}

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<HttpResponse>;

export interface GitHubApiOptions {
  readonly fetch: FetchLike;
  readonly apiBase?: string;
}

/** Error that carries only the HTTP status and the request kind. The response body is never included. */
export class GitHubApiError extends Error {
  readonly code = 'github_api_error';
  constructor(
    readonly status: number,
    readonly operation: string,
  ) {
    super(`GitHub API ${operation} failed with status ${status}`);
    this.name = 'GitHubApiError';
  }
}

export interface MintedToken {
  readonly token: string;
  readonly expiresAtMs: number;
}

export async function mintInstallationToken(
  opts: GitHubApiOptions & { appId: string; privateKeyPem: string; now: () => number },
  installationId: number,
): Promise<MintedToken> {
  const jwt = createAppJwt(opts.appId, opts.privateKeyPem, Math.floor(opts.now() / 1000));
  const res = await opts.fetch(`${opts.apiBase ?? 'https://api.github.com'}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: githubHeaders(jwt),
  });
  if (!res.ok) throw new GitHubApiError(res.status, 'mint_installation_token');
  const body = (await res.json()) as { token?: unknown; expires_at?: unknown };
  if (typeof body.token !== 'string' || typeof body.expires_at !== 'string') {
    throw new GitHubApiError(res.status, 'mint_installation_token_malformed');
  }
  return { token: body.token, expiresAtMs: Date.parse(body.expires_at) };
}

/**
 * In-memory cache of installation tokens. Refreshes five minutes before expiry.
 * Holds tokens only in this process.
 */
export class InstallationTokenCache {
  private readonly entries = new Map<number, MintedToken>();

  constructor(
    private readonly mint: (installationId: number) => Promise<MintedToken>,
    private readonly now: () => number,
    private readonly refreshSkewMs = 5 * 60_000,
  ) {}

  async get(installationId: number): Promise<string> {
    const cached = this.entries.get(installationId);
    if (cached && cached.expiresAtMs - this.now() > this.refreshSkewMs) {
      return cached.token;
    }
    const fresh = await this.mint(installationId);
    this.entries.set(installationId, fresh);
    return fresh.token;
  }

  /** Test and shutdown hook. Drops every cached token. */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export function githubHeaders(bearer: string): Record<string, string> {
  return {
    Authorization: `Bearer ${bearer}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}
