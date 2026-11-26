# AWS deployment status and resume guide

Status as of 2026-11-26. Region: `ap-south-1` (Mumbai). Account: `<ACCOUNT_ID>` (kept out of the repo).

Current blocker: App Runner cannot create its VPC connector. See "Blocker" below.

## Done

| Item | State | Name or detail |
| --- | --- | --- |
| ECR repository | Ready, immutable tags, scan on push, AES-256 | `parmana-github-app` |
| Container image | Pushed by the **Build and push image** workflow from `main` | tag `6768341e4273ffc135ec9a33164787983e692d1f` |
| RDS PostgreSQL | Available when last checked, then **stopped** on 2026-11-26 | `parmana-db`, PostgreSQL 16.16, `db.t4g.micro`, 20 GB gp3, encrypted, not public, deletion protection on, 7-day backups |
| RDS admin password | Managed by RDS in Secrets Manager | secret name starts with `rds!db-` |
| App secrets | Created in Secrets Manager | `parmana/app-db-password`, `parmana/migration-database-url`, `parmana/database-url`, `parmana/webhook-secret` |
| App Runner ECR access role | Created | `parmana-apprunner-ecr-access` with `AWSAppRunnerServicePolicyForECRAccess` |
| App Runner instance role | Created | `parmana-apprunner-instance` with read access to `parmana/*` secrets |
| App Runner service-linked role | Created | `AWSServiceRoleForAppRunner` |
| GitHub App | Registered and installed on the test repository | App ID `5924108`, installation `185836118`, test repository `pavancharak/parmana-github-test` |
| Live GitHub API check | Passed | run `45660912921`, see `docs/testing/results/phase1-live-api-2026-11-25.md` |

## Code state

- `main` includes the webhook, persistence with RLS, HTTP entrypoint, Dockerfile, CI, live check, and the startup step that sets the `parmana_app` password from `APP_DB_PASSWORD` (PR #8).
- Tests: 76 pass on a scram-sha-256 PostgreSQL 16 cluster.

## IAM for the deployer

- User: `parmana-deployer`. It is separate from the KMS drill user and the `dip-*` users, and none of them should be used for this deployment.
- Inline/customer policy: `parmana-deployer-policy`. It covers App Runner, ECR, RDS, Secrets Manager, logs, EC2 describe, KMS through RDS and Secrets Manager only, and IAM only on `parmana-*` roles and the RDS and App Runner service-linked roles. All region-limited to `ap-south-1`.
- Managed policy: `AWSAppRunnerFullAccess` attached directly.
- Permissions boundary: `parmana-deployer-boundary` (Mumbai-only). It is currently **removed** for a diagnostic test. Set it again (see Resume).

## Blocker

`aws apprunner create-vpc-connector` fails with:

> InvalidRequestException: AccessDenied. Couldn't create a service-linked role for App Runner. When creating the first vpc connector in the account, caller must have the 'iam:CreateServiceLinkedRole' permission.

Checked and still failing:

- `AWSAppRunnerFullAccess` attached and the boundary set.
- The boundary removed, to rule it out.
- The service-linked role already exists.

The cause is not yet known. A support case is the next step. Text for the case:

> Subject: App Runner VPC connector fails with AccessDenied for service-linked role, account <ACCOUNT_ID>, ap-south-1
>
> `CreateVpcConnector` returns `InvalidRequestException: AccessDenied. Couldn't create a service-linked role for App Runner.` The IAM user `parmana-deployer` has `AWSAppRunnerFullAccess` and `iam:CreateServiceLinkedRole` for `apprunner.amazonaws.com`. The App Runner service-linked role `AWSServiceRoleForAppRunner` already exists in the account. Please confirm which additional permission the first VPC connector creation requires, and whether this account needs a manual step.

## Cost

- `parmana-db` is stopped. Storage and backups are still billed. Compute is not.
- RDS starts stopped instances automatically after 7 days. Stop it again, or delete it if it's no longer needed.

## Resume

1. Restart the database: RDS → Databases → `parmana-db` → Actions → **Start**, or `aws rds start-db-instance --db-instance-identifier parmana-db`.
2. Check the IAM state: `parmana-deployer` has `AWSAppRunnerFullAccess`, and the boundary is set to `parmana-deployer-boundary` again.
3. Retry the connector. It needs subnets in the default VPC `vpc-0bb51294d9ee03904` (default-for-AZ subnets) and the default security group, which lets resources in the same group talk to each other:
   ```
   aws apprunner create-vpc-connector --vpc-connector-name parmana-connector --subnets <subnet ids> --security-groups <default SG id>
   ```
4. Create the App Runner service from ECR image `parmana-github-app:6768341e4273ffc135ec9a33164787983e692d1f`, port 8080, health check `/healthz`, with:
   - Runtime environment variables: `RUN_MIGRATIONS=true`, `PORT=8080`.
   - Runtime secrets from Secrets Manager: `DATABASE_URL` → `parmana/database-url`, `MIGRATION_DATABASE_URL` → `parmana/migration-database-url`, `APP_DB_PASSWORD` → `parmana/app-db-password`, `GITHUB_WEBHOOK_SECRET` → `parmana/webhook-secret`.
   - Instance role `parmana-apprunner-instance`, access role `parmana-apprunner-ecr-access`, egress through `parmana-connector`.
5. Check `/healthz` and `/readyz`, then give the public HTTPS host.
6. Set the GitHub App's webhook URL to `https://<host>/webhooks/github`, add the webhook secret, and tick **Active**.
7. Send a test installation event and confirm the response.

## Known limits

- The app connects to RDS with TLS but doesn't verify the server certificate. The RDS CA bundle should be added to the image.
- The admin URL secret holds the RDS-managed admin password as a copy. If RDS rotates that password, the copy must be updated.
- The image was built on GitHub Actions. Docker is not available in the sandbox.
