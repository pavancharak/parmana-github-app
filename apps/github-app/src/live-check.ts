import {
  githubHeaders,
  listConfigFiles,
  listInstallationRepositories,
  mintInstallationToken,
  publishCheckRun,
  type FetchLike,
} from '@parmana/github-client';

/**
 * Live check against the real GitHub API, run by hand from the CI workflow.
 * Mints an installation token, confirms the test repository is in the
 * installation, lists supported configuration files at the default branch
 * head, and publishes a neutral Check Run on that commit.
 *
 * Configuration comes from environment secrets. Tokens and keys are never printed.
 */
function env(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`${name} is not set`);
  return value;
}

const fetchImpl: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

async function main(): Promise<void> {
  const appId = env('APP_ID');
  const privateKeyPem = env('APP_PRIVATE_KEY');
  const installationId = Number(env('APP_INSTALLATION_ID'));
  const [owner, name] = env('TEST_REPO').split('/');
  if (!owner || !name || !Number.isSafeInteger(installationId)) {
    throw new Error('TEST_REPO must be owner/name and APP_INSTALLATION_ID must be a number');
  }

  const minted = await mintInstallationToken(
    { fetch: fetchImpl, appId, privateKeyPem, now: () => Date.now() },
    installationId,
  );
  const token = minted.token;
  console.log(`installation token minted (expires in ${Math.round((minted.expiresAtMs - Date.now()) / 60_000)} min)`);

  const repos = await listInstallationRepositories({ fetch: fetchImpl, token });
  if (!repos.some((r) => r.full_name === `${owner}/${name}`)) {
    throw new Error('test repository is not accessible to this installation');
  }
  console.log(`installation can access ${repos.length} repository(ies); test repository is included`);

  const repoRes = await fetchImpl(`https://api.github.com/repos/${owner}/${name}`, {
    method: 'GET',
    headers: githubHeaders(token),
  });
  if (!repoRes.ok) throw new Error(`repository lookup failed with status ${repoRes.status}`);
  const repoBody = (await repoRes.json()) as { default_branch: string };

  const commitRes = await fetchImpl(
    `https://api.github.com/repos/${owner}/${name}/commits/${encodeURIComponent(repoBody.default_branch)}`,
    { method: 'GET', headers: githubHeaders(token) },
  );
  if (!commitRes.ok) throw new Error(`commit lookup failed with status ${commitRes.status}`);
  const head = ((await commitRes.json()) as { sha: string }).sha;

  const files = await listConfigFiles({ fetch: fetchImpl, token }, { owner, name }, head);
  console.log(`supported configuration files at ${head.slice(0, 7)}: ${files.length}`);
  for (const f of files) console.log(`  ${f.path}`);

  await publishCheckRun(
    { fetch: fetchImpl, token },
    {
      owner,
      repo: name,
      headSha: head,
      conclusion: 'neutral',
      summary: `Live API check: ${files.length} supported configuration file(s) found. No evaluation was performed.`,
      evidencePersisted: false,
      currentHeadSha: async () => head,
    },
  );
  console.log('neutral check run published on the head commit');
}

main().catch((err: unknown) => {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error';
  console.error(`live check failed: ${detail}`);
  process.exit(1);
});
