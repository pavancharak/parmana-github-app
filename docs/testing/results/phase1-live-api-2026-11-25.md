# Phase 1 live GitHub API run: 2026-11-25

## Result

**Pass.** The GitHub App authenticated against the real GitHub API, read the test repository, and published a neutral Check Run on the repository's head commit.

| Item | Value |
| --- | --- |
| Workflow | Live GitHub API check (`.github/workflows/live-api.yml`) |
| Trigger | Manual (`workflow_dispatch`) by pavancharak |
| Run | [45660912921](https://github.com/pavancharak/parmana-github-app/actions/runs/45660912921), run number 1, attempt 1 |
| Job | `live-check`, job ID 139370196260, conclusion `success` |
| Code under test | `main` at `ee3f1373e568349c4e2c4f7952f94f8cbf6fb699` (PR #6) |
| Runner | `ubuntu-latest`, Node v24.22.3, pnpm 10.28.0 |
| App | Parmana Agent Permission Control, App ID 5924108 |
| Installation | ID 185836118, personal account, selected repositories only |
| Test repository | `pavancharak/parmana-github-test` |

## What the run showed

Taken from the job log:

1. `installation token minted (expires in 60 min)`. The token was not printed.
2. `installation can access 1 repository(ies); test repository is included`.
3. `supported configuration files at ac6a808: 1`, listing `.github/workflows/ci.yml`.
4. `neutral check run published on the head commit`.

Each of the four steps above was reached in order. The job's other steps (checkout, pnpm, Node, install) succeeded.

## What this run did not cover

- **Webhooks.** The App's webhook is inactive, so no events reached the service. Installation and pull request events are still untested live.
- **PR evaluation.** The check ran on a branch head commit, not on a pull request. The success conclusion path was not exercised. The run published `neutral`, which never requires evidence.
- **Discovery scope.** The test repository has only one supported file. Path selection for `.claude/`, `AGENTS.md`, `.mcp.json` and Copilot instructions was not exercised live.
- **Persistence.** The live check does not write to PostgreSQL.

## Side effects

- A neutral check run named `Parmana / Agent Permission Control` now exists on commit `ac6a808` of `pavancharak/parmana-github-test`. It has no effect on merging there. It can be deleted from that commit's checks list.

## Secrets used

Names only. Values are not recorded here.

| Secret | Used for |
| --- | --- |
| `APP_ID` | App identifier for the JWT |
| `APP_PRIVATE_KEY` | Signs the App JWT |
| `APP_INSTALLATION_ID` | Selects the installation to mint a token for |
| `TEST_REPO` | `owner/name` of the test repository |

Secret names cannot start with `GITHUB_`. GitHub reserves that prefix.
