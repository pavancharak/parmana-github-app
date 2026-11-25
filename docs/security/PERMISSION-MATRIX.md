# Permission Matrix

Document version: 1.0
Status: Proposed. Each GitHub App permission must be justified before the App manifest is created in Phase 1. Permissions not listed here must not be requested.

## 1. GitHub App repository permissions

| Permission | Level | Why required | Used by | Least-privilege note |
| --- | --- | --- | --- | --- |
| Contents | Read | Read configuration files at the evaluated SHA | Scanner | No write |
| Metadata | Read | Required by GitHub for repository listing | All | Mandatory |
| Pull requests | Read | Receive PR metadata, changed files and head/base SHAs | PR evaluation | No write; no review submission |
| Checks | Write | Create and update Check Runs | Enforcement | Only Check Runs; no other check-related writes are performed |
| Actions | None | Workflow files are read through Contents | Discovery of `.github/workflows/` | Do not request |
| Administration | None | Branch protection is customer-managed | Not used | Do not request |
| Issues | None | Not needed; notifications use Parmana channels | Not used | Do not request in Release 1.0 unless Phase 5 design requires comments |
| Workflows | None | Modifying workflow files is out of scope | Not used | Do not request |

## 2. GitHub App organization permissions

| Permission | Level | Why | Decision |
| --- | --- | --- | --- |
| Members | None | Role mapping uses Parmana memberships, not GitHub teams, in 1.0 | Not requested; OD-04 may revisit |

## 3. Event subscriptions

| Event | Why |
| --- | --- |
| Installation | Lifecycle (FR-01) |
| Installation repositories | Selection changes (FR-01) |
| Pull request | Evaluation trigger (FR-08) |
| Ping | Connectivity |

Not subscribed: `push`, `issue_comment`, `pull_request_review`, `check_run` in Release 1.0. Subscribing to additional events requires a row in this matrix.

## 4. Application roles (Parmana users)

| Capability | Owner | Security Admin | Eng Admin | Approver | Developer | Auditor |
| --- | --- | --- | --- | --- | --- | --- |
| View installation and repository inventory | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Manage installation settings | ✔ | | ✔ | | | |
| Create policy draft | | ✔ | | | | |
| Publish policy | | ✔ (two-person per OD-08) | | | | |
| Propose baseline version | | ✔ | ✔ | | | |
| Approve baseline version | | ✔ (not the proposer) | | | | |
| Approve capability change request | | | | ✔ (not the PR author where separation applies) | | |
| View PR decisions and drift | ✔ | ✔ | ✔ | ✔ | ✔ (own repos) | ✔ |
| View evidence and verification | ✔ | ✔ | ✔ | ✔ | ✔ (own PRs) | ✔ |
| Export evidence | ✔ | ✔ | | | | ✔ |
| View audit history | ✔ | ✔ | | | | ✔ |
| Suspend or delete tenant | ✔ | | | | | |
| Manage users and roles | ✔ | | | | | |
| Modify any setting | ✔ (organization settings) | ✔ (policy settings) | ✔ (repo settings) | | | |

Rules:

1. Roles are tenant-specific (FR, section 3 of the PRD).
2. Auditors have read-only access in every surface.
3. Developers cannot modify organization-wide policies.
4. Users cannot approve their own restricted changes (AUTH-016).
5. Revoking a membership takes effect on the next request; cached sessions are invalidated (TBD: maximum 5 minutes, OD to confirm).

## 5. Permission review

Each change to this matrix requires:

1. Justification in the pull request.
2. Update to the App manifest.
3. Update to `architecture/GITHUB-INTEGRATION.md`.
4. Notification to installed organizations when a new permission is requested (GitHub requires owner acceptance).
