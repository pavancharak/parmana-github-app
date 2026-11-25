# GitHub Integration

Document version: 1.0
Status: Proposed. The exact GitHub permission set is in `security/PERMISSION-MATRIX.md`.

## 1. App identity

- A single GitHub App per environment (development, staging, production), each with its own App ID, webhook secret and private key.
- The private key is stored in KMS-backed secret storage and never in source, logs or the database.
- Installation access tokens are minted per request, scoped to the installation, and held in memory only (FR-01 acceptance: no plaintext token storage).

## 2. Installation lifecycle

| GitHub event | Parmana action | Test |
| --- | --- | --- |
| `installation.created` | Create tenant if no tenant exists for installation ID; reconcile repositories | GH-001 |
| `installation.created` (repeated) | No-op beyond audit; no duplicate tenant | GH-002 |
| `installation.suspend` | Set status `suspended`; stop evaluation; audit | GH-004 |
| `installation.unsuspend` | Set status `active`; reconcile; audit | GH-004 |
| `installation.deleted` | Set status `removed`; revoke access; audit | GH-005 |
| `installation_repositories.added` / `removed` | Reconcile repository inventory; audit | GH-003 |
| `installation.new_permissions_accepted` | Re-verify permissions; notify owners (FR-12.4) | NOT-03 |

## 3. Repository selection

- **All repositories** mode: the inventory follows the installation's accessible repository list.
- **Selected repositories** mode: only selected repositories are readable. Requests for other repositories are rejected before any API call (GH-003).
- A repository removed from selection is marked inaccessible. Its historical evaluations remain, read-only.

## 4. Webhook handling

1. Read the raw body. Enforce a maximum body size (initial value: 1 MiB; TBD after payload measurement).
2. Compute HMAC-SHA256 with the webhook secret and compare in constant time against `X-Hub-Signature-256`. Reject on mismatch (GH-007).
3. Read `X-GitHub-Delivery`. Insert into `webhook_events` with unique key. A duplicate delivery returns the prior status (GH-008).
4. Validate `X-GitHub-Event` against the allowlist: `installation`, `installation_repositories`, `pull_request`, `check_run` (read only, for re-run requests if enabled), `ping`. Unknown events are acknowledged and ignored.
5. Resolve installation ID to tenant. If none or inactive, record and skip, never evaluate (TEN-008).
6. Enqueue job with tenant ID, delivery ID and head SHA. Commit the queue write before responding.
7. Respond `202 Accepted`. Target: within 10 seconds (NFR operational target).

## 5. Pull request events

| Action | Behavior | Test |
| --- | --- | --- |
| `opened` | Create evaluation for head SHA | GH-009 |
| `synchronize` | Create evaluation for new head SHA; mark previous pending evaluation superseded | GH-010 |
| `reopened` | Re-evaluate current head SHA if no evaluation for it exists | GH-011 |
| `closed` | Mark open approval requests closed; no new evaluation | GH-011 |

## 6. Reading repository content

- Files are read **at a specific commit SHA** using the Git Data or Contents API, never the default branch unless that is the evaluated SHA.
- For PRs, the evaluated content is the **head SHA** of the PR. Base content comes from the **base SHA** for comparison.
- Per-file size limit and per-scan file count limit apply (PERF-003). Limits are TBD and set in Phase 2.
- Content is fetched only for repositories that are accessible to the installation at that moment (GH-014). A revoked repository results in a failed evaluation, not stale content.
- Symlinks and submodules are not followed.

## 7. Checks

- Check name: `Parmana / Agent Permission Control`.
- Check is created with `head_sha` equal to the evaluated commit (GH-017, AC-08.8).
- Status mapping per FR-08 table. Conclusions: `success`, `action_required` (approval pending), `failure`, plus `neutral` for informational results.
- Check output includes a summary, drift findings (without secret values), and a link to the evidence record in the dashboard.
- **Stale result rule.** Before publishing, the worker compares the evaluated head SHA with the current head SHA of the PR. If they differ, the result is not published as the final state for the PR, and the newer evaluation governs (GH-018).
- **Evaluation unavailable.** If Core or evidence persistence is unavailable, publish `failure` with the reason, or leave `in_progress` with a retry schedule, but never `success` (AC-08.4, AC-10.6). Choice recorded in ADR-0002.

## 8. Rate limits and retries

- Respect `x-ratelimit-*` and `retry-after` headers. Requeue with the server-indicated delay plus jitter (GH-015).
- Retries for transient 5xx and network errors use bounded exponential backoff with jitter. Maximum attempts and dead-letter threshold are TBD in `operations/MONITORING.md`.
- Secondary rate limits are treated as retryable with the indicated delay.

## 9. Permissions requested by the App

The App requests only the permissions in `security/PERMISSION-MATRIX.md`. Permission changes after installation trigger `installation.new_permissions_accepted` and require owner review. A permission not in the matrix must not be requested.

## 10. Unsupported by design

- Reading content from forks, outside the installation, or from other organizations.
- Writing to repositories, including pushing commits, merging PRs or changing branch protection. Enforcement is by Check Run only (FR-08 note).
