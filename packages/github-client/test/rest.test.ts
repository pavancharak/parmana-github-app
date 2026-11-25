import { describe, expect, it } from 'vitest';
import {
  EvidenceMissingError,
  isSupportedConfigPath,
  listConfigFiles,
  listInstallationRepositories,
  publishCheckRun,
  StaleEvaluationError,
  TreeTruncatedError,
  CHECK_RUN_NAME,
  type FetchLike,
  type HttpResponse,
} from '../src/index.js';

const response = (status: number, body: unknown): HttpResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

describe('supported configuration paths (FR-03)', () => {
  it.each([
    ['.claude/settings.json', true],
    ['.claude/agents/review.md', true],
    ['AGENTS.md', true],
    ['.github/copilot-instructions.md', true],
    ['.mcp.json', true],
    ['.github/workflows/ci.yml', true],
    ['.github/workflows/deploy.yaml', true],
    ['.github/workflows/nested/x.yml', false],
    ['src/index.ts', false],
    ['docs/AGENTS.md', false],
    ['.claudeconfig', false],
  ])('%s -> %s', (path, expected) => {
    expect(isSupportedConfigPath(path)).toBe(expected);
  });
});

describe('listConfigFiles (GH-012, FR-03.3)', () => {
  it('returns only supported blobs, sorted, with their content digests', async () => {
    const fetchImpl: FetchLike = async (url) => {
      expect(url).toContain(`/repos/o/r/git/trees/${SHA}?recursive=1`);
      return response(200, {
        truncated: false,
        tree: [
          { path: 'src/a.ts', type: 'blob', sha: 'x1' },
          { path: 'AGENTS.md', type: 'blob', sha: 'x2' },
          { path: '.claude', type: 'tree', sha: 'x3' },
          { path: '.claude/settings.json', type: 'blob', sha: 'x4' },
        ],
      });
    };
    const files = await listConfigFiles({ fetch: fetchImpl, token: 't' }, { owner: 'o', name: 'r' }, SHA);
    expect(files).toEqual([
      { path: '.claude/settings.json', blobSha: 'x4' },
      { path: 'AGENTS.md', blobSha: 'x2' },
    ]);
  });

  it('refuses a truncated tree rather than reporting a partial list as complete', async () => {
    const fetchImpl: FetchLike = async () => response(200, { truncated: true, tree: [] });
    await expect(listConfigFiles({ fetch: fetchImpl, token: 't' }, { owner: 'o', name: 'r' }, SHA)).rejects.toBeInstanceOf(
      TreeTruncatedError,
    );
  });
});

describe('listInstallationRepositories (GH-003)', () => {
  it('follows pagination until a short page', async () => {
    const pages: number[] = [];
    const fetchImpl: FetchLike = async (url) => {
      const page = Number(new URL(url).searchParams.get('page'));
      pages.push(page);
      const count = page === 1 ? 100 : 3;
      const repositories = Array.from({ length: count }, (_, i) => ({ id: page * 1000 + i, full_name: `o/r${i}` }));
      return response(200, { repositories });
    };
    const repos = await listInstallationRepositories({ fetch: fetchImpl, token: 't' });
    expect(pages).toEqual([1, 2]);
    expect(repos).toHaveLength(103);
  });
});

describe('publishCheckRun (GH-017, GH-018, AC-08.8, AC-10.6)', () => {
  const base = {
    owner: 'o',
    repo: 'r',
    headSha: SHA,
    summary: 'drift detected',
    currentHeadSha: async () => SHA,
  };

  it('GH-017: publishes a completed check bound to the evaluated head SHA', async () => {
    let body: Record<string, unknown> | undefined;
    const fetchImpl: FetchLike = async (url, init) => {
      expect(url).toBe('https://api.github.com/repos/o/r/check-runs');
      body = JSON.parse(init.body ?? '{}') as Record<string, unknown>;
      return response(201, {});
    };
    await publishCheckRun({ fetch: fetchImpl, token: 't' }, { ...base, conclusion: 'failure', evidencePersisted: false });
    expect(body).toMatchObject({
      name: CHECK_RUN_NAME,
      head_sha: SHA,
      status: 'completed',
      conclusion: 'failure',
    });
  });

  it('GH-018: a stale evaluation is never published', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls++;
      return response(201, {});
    };
    await expect(
      publishCheckRun(
        { fetch: fetchImpl, token: 't' },
        { ...base, currentHeadSha: async () => OTHER, conclusion: 'failure', evidencePersisted: false },
      ),
    ).rejects.toBeInstanceOf(StaleEvaluationError);
    expect(calls).toBe(0);
  });

  it('AC-10.6 / INV-2: success is refused without persisted evidence, and no request is sent', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls++;
      return response(201, {});
    };
    await expect(
      publishCheckRun({ fetch: fetchImpl, token: 't' }, { ...base, conclusion: 'success', evidencePersisted: false }),
    ).rejects.toBeInstanceOf(EvidenceMissingError);
    expect(calls).toBe(0);
  });

  it('success is published once evidence is persisted', async () => {
    const fetchImpl: FetchLike = async () => response(201, {});
    await expect(
      publishCheckRun({ fetch: fetchImpl, token: 't' }, { ...base, conclusion: 'success', evidencePersisted: true }),
    ).resolves.toBeUndefined();
  });

  it('fail-closed conclusions are published even without evidence', async () => {
    const fetchImpl: FetchLike = async () => response(201, {});
    await expect(
      publishCheckRun({ fetch: fetchImpl, token: 't' }, { ...base, conclusion: 'action_required', evidencePersisted: false }),
    ).resolves.toBeUndefined();
  });
});
