# Live GitHub API check: runbook

Purpose: confirm that the GitHub App can authenticate, read an installation's repositories, list configuration files, and publish a Check Run against the real GitHub API. It is a manual smoke test and does not run in CI on pull requests.

## Before you run it

Four repository secrets must exist in `pavancharak/parmana-github-app` (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `APP_ID` | The App ID from the App's settings page |
| `APP_PRIVATE_KEY` | The full contents of the `.pem` file, including the `BEGIN` and `END` lines |
| `APP_INSTALLATION_ID` | The number after `/installations/` on the installation's settings page |
| `TEST_REPO` | `owner/name` of a repository the installation can access |

The App must be installed on `TEST_REPO`. Installing on a repository that isn't in the selection makes the run fail with "test repository is not accessible to this installation".

## Run it

1. Open the repository's **Actions** tab.
2. Choose **Live GitHub API check** in the left list.
3. Click **Run workflow**, choose `main`, and click the green button.
4. Open the run and check the `Run live check against the GitHub API` step. The expected output is:
   - `installation token minted (expires in 60 min)`
   - `installation can access N repository(ies); test repository is included`
   - `supported configuration files at <sha>: N`
   - `neutral check run published on the head commit`

## What the check does

1. Mints a short-lived installation token from the App's private key. The token is held in memory and never printed.
2. Confirms `TEST_REPO` is in the installation's repository list.
3. Reads the default branch's head commit.
4. Lists supported configuration files at that commit.
5. Publishes a `neutral` Check Run named `Parmana / Agent Permission Control` on that commit.

It performs no evaluation, writes nothing to a database, and doesn't merge or change any pull request.

## Failure messages

| Message | Likely cause |
| --- | --- |
| `APP_PRIVATE_KEY is not set` (or another name) | A secret is missing or misnamed |
| `token mint failed with status 401` | Wrong App ID, or the key doesn't belong to this App |
| `token mint failed with status 404` | Wrong `APP_INSTALLATION_ID`, or the App is not installed |
| `test repository is not accessible to this installation` | `TEST_REPO` is not in the installation's selection |
| `repository lookup failed with status 404` | The repository name is wrong |

## Side effects

Each successful run leaves one neutral check run on the default branch's head commit of `TEST_REPO`. Delete it from that commit's checks list if you don't want it kept.

## Rotating the private key

1. Generate a new key on the App's settings page.
2. Replace `APP_PRIVATE_KEY` in the secrets page.
3. Run the check once to confirm.
4. Delete the old key on the App's settings page.
