# Value proposition: Parmana Agent Permission Control

Status: Final draft for review. Document version 1.0.

## Statement

Know which AI agents can act in your repositories, whether their permissions have changed, and whether each change was approved, with a verifiable record of every decision.

## What the product does

- **See what agents are declared to do.** Parmana finds agent configuration files across your GitHub organization and records the capabilities they declare, each linked to the file and commit it came from.
- **Catch permission drift in pull requests.** When a pull request expands an agent's authority, Parmana flags it and publishes a GitHub check on that exact commit. Repository owners decide whether to require the check before merging.
- **Keep approvals honest.** An approval applies only to the commit it was given for. A new commit needs a new decision.
- **Prove decisions later.** Each decision is signed and linked to the one before it, so a customer can verify the record offline without trusting the vendor.

## What the product does not do

- It reports what agents are declared to do. It does not prove what agents actually did at runtime.
- It does not block merges by itself. Enforcement depends on the customer's branch protection rules or rulesets.
- It does not replace IAM, branch protection, or endpoint security.

## Who it is for

- **Security administrators** who need to define what agents may do, and see when that changes.
- **Engineering administrators** who need checks visible on pull requests, without changing developer workflow.
- **Auditors** who need signed, verifiable records of each decision.

## Evidence behind each claim

| Claim | Where it is supported |
| --- | --- |
| Declared capabilities are linked to source | `docs/api/CAPABILITY-SCHEMA.md` §3; test NORM-03 |
| Drift is flagged on pull requests | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-06, FR-08 |
| Approvals apply only to one commit | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-09; test AUTH-013 |
| Decisions are signed and chained | `docs/security/CRYPTOGRAPHIC-EVIDENCE.md`; tests CRY-001 to CRY-012 |
| Checks are published only for the evaluated commit | `packages/github-client/src/rest.ts`; test GH-017, GH-018 |
| Success is never published without evidence | `packages/github-client/src/rest.ts`; test AC-10.6 |

Status of these claims: the GitHub integration, webhook handling, and check publication are implemented and tested. Policy evaluation, signing and offline verification are specified but not yet built. Customer-facing copy must say so until they are.

## Pilot status

The pilot (ADR-0006, accepted 2026-11-26) covers one repository, one settings format and one rule, with dry-run and unsigned records. Benefits that need signed records, the dashboard, or more than one format are Release 1.0 claims and must not be used in pilot material.

## Non-claims for customer material

Use the wording in `docs/security/SECURITY-BOUNDARIES.md` §2. In particular, do not say that Parmana proves what an agent executed, or that it prevents merges on its own.
