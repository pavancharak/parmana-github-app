import { GitHubApiError, githubHeaders, type GitHubApiOptions } from './app-auth.js';

export const CHECK_RUN_NAME = 'Parmana / Agent Permission Control';

// ---- configuration file discovery (FR-03) -----------------------------------

/**
 * Returns true when a repository path is a supported agent configuration file
 * (FR-03 discovery targets). Parsing happens in Phase 2. This only identifies paths.
 */
export function isSupportedConfigPath(path: string): boolean {
  if (path === 'AGENTS.md' || path === '.mcp.json') return true;
  if (path === '.github/copilot-instructions.md') return true;
  if (path.startsWith('.claude/')) return true;
  return /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path);
}

export interface ConfigFile {
  readonly path: string;
  /** Git blob SHA: the content digest used for change detection. */
  readonly blobSha: string;
}

export class TreeTruncatedError extends Error {
  readonly code = 'tree_truncated';
  constructor() {
    super('repository tree was truncated by GitHub; discovery is incomplete and will not be reported as complete');
    this.name = 'TreeTruncatedError';
  }
}

/**
 * Lists supported configuration files at a specific commit (GITHUB-INTEGRATION §6).
 * Fails when GitHub truncates the tree, because a partial list must not look complete.
 */
export async function listConfigFiles(
  opts: GitHubApiOptions & { token: string },
  repo: { owner: string; name: string },
  commitSha: string,
): Promise<ConfigFile[]> {
  const url = `${opts.apiBase ?? 'https://api.github.com'}/repos/${repo.owner}/${repo.name}/git/trees/${commitSha}?recursive=1`;
  const res = await opts.fetch(url, { method: 'GET', headers: githubHeaders(opts.token) });
  if (!res.ok) throw new GitHubApiError(res.status, 'list_tree');
  const body = (await res.json()) as { tree?: Array<{ path: string; type: string; sha: string }>; truncated?: boolean };
  if (body.truncated === true) throw new TreeTruncatedError();
  return (body.tree ?? [])
    .filter((e) => e.type === 'blob' && isSupportedConfigPath(e.path))
    .map((e) => ({ path: e.path, blobSha: e.sha }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// ---- repository inventory ---------------------------------------------------

export interface InstallationRepo {
  readonly id: number;
  readonly full_name: string;
}

/** Lists all repositories the installation can access, following pagination (GH-003). */
export async function listInstallationRepositories(
  opts: GitHubApiOptions & { token: string },
): Promise<InstallationRepo[]> {
  const base = opts.apiBase ?? 'https://api.github.com';
  const out: InstallationRepo[] = [];
  for (let page = 1; ; page++) {
    const res = await opts.fetch(`${base}/installation/repositories?per_page=100&page=${page}`, {
      method: 'GET',
      headers: githubHeaders(opts.token),
    });
    if (!res.ok) throw new GitHubApiError(res.status, 'list_installation_repositories');
    const body = (await res.json()) as { repositories?: InstallationRepo[] };
    const repos = body.repositories ?? [];
    out.push(...repos);
    if (repos.length < 100) break;
  }
  return out;
}

// ---- Check Runs (FR-08, GITHUB-INTEGRATION §7) ------------------------------

export type CheckConclusion = 'success' | 'failure' | 'action_required' | 'neutral';

export class StaleEvaluationError extends Error {
  readonly code = 'stale_evaluation';
  constructor(
    readonly evaluatedSha: string,
    readonly currentSha: string,
  ) {
    super('evaluated commit is no longer the head of the pull request; result not published');
    this.name = 'StaleEvaluationError';
  }
}

export class EvidenceMissingError extends Error {
  readonly code = 'evidence_missing';
  constructor() {
    super('a success conclusion requires persisted evidence (AC-10.6); not published');
    this.name = 'EvidenceMissingError';
  }
}

export interface CheckRunInput {
  readonly owner: string;
  readonly repo: string;
  /** The commit that was evaluated. The check is bound to this SHA (AC-08.8). */
  readonly headSha: string;
  readonly conclusion: CheckConclusion;
  readonly summary: string;
  /** True only after the evidence record for this decision has been committed. */
  readonly evidencePersisted: boolean;
  /** Reads the PR's current head SHA. Called immediately before publishing (GH-018). */
  readonly currentHeadSha: () => Promise<string>;
}

/**
 * Publishes a completed Check Run for one evaluated commit.
 *
 * Enforces three rules before any request is sent:
 * - A stale result is never published (GH-018).
 * - `success` is never published without persisted evidence (INV-2, AC-10.6).
 * - Failure-type conclusions are published regardless, since they fail closed.
 */
export async function publishCheckRun(
  opts: GitHubApiOptions & { token: string },
  input: CheckRunInput,
): Promise<void> {
  if (input.conclusion === 'success' && !input.evidencePersisted) {
    throw new EvidenceMissingError();
  }
  const current = await input.currentHeadSha();
  if (current !== input.headSha) {
    throw new StaleEvaluationError(input.headSha, current);
  }

  const res = await opts.fetch(
    `${opts.apiBase ?? 'https://api.github.com'}/repos/${input.owner}/${input.repo}/check-runs`,
    {
      method: 'POST',
      headers: { ...githubHeaders(opts.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: CHECK_RUN_NAME,
        head_sha: input.headSha,
        status: 'completed',
        conclusion: input.conclusion,
        output: { title: CHECK_RUN_NAME, summary: input.summary },
      }),
    },
  );
  if (!res.ok) throw new GitHubApiError(res.status, 'create_check_run');
}
