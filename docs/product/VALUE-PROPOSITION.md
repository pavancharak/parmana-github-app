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

## Business value

Written in plain terms. Each benefit is labelled with its status, so customer copy only uses the ones that are true today.

**Saves money and time**
- *Fewer surprise problems.* A helper that suddenly gains deploy access can cause an outage. Catching that change before it ships avoids the cost of cleaning up after it. Status: specified, not yet built.
- *Faster audits.* The auditor gets an answer in an afternoon, not weeks of searching. Status: specified; depends on signed records, not yet built.
- *Less review work.* Reviewers see permission changes already highlighted, instead of reading every settings file. Status: specified; depends on reading settings files, not yet built.

**Lowers risk**
- *Catches quiet expansions.* A small edit to a settings file is easy to miss. Status: specified; depends on the drift engine, not yet built.
- *One place for every helper.* Companies using several AI tools get a single check instead of one per tool. Status: specified; only one format is planned for the first release.

**Helps the business**
- *Shows the company is in control.* Customers and partners ask how AI tools are governed. Status: specified; depends on the record and the approval step.
- *Supports compliance.* The record of decisions helps with security questionnaires and regulated industries. Status: specified; depends on signed records.
- *Builds trust in AI adoption.* Teams can use agents more freely, because risky changes are caught. Status: specified.

**Gives leaders a clear view**
- *One answer to "what can our AI tools do?"* Status: specified; depends on the dashboard, not yet built.

**The headline for a buyer:** a company can adopt AI helpers faster without giving up control. This is the claim to lead with once the first working path is complete.

## Non-claims for customer material

Use the wording in `docs/security/SECURITY-BOUNDARIES.md` §2. In particular, do not say that Parmana proves what an agent executed, or that it prevents merges on its own.
