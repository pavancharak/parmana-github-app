# Value proposition: Parmana Agent Permission Control

Status: Draft for review. Document version 1.3.

## Statement

Know what every AI agent in your repositories is allowed to do, whichever tool or model it runs on, and whether that changed in a pull request, with a verifiable record of each decision.

## What the product does

- **See what agents are declared to do.** Parmana reads agent configuration files in your repositories and records the permissions they declare, each linked to the file and commit it came from.
- **Catch permission drift in pull requests.** When a pull request expands an agent's authority, Parmana flags it and publishes a GitHub check on that exact commit. Repository owners decide whether to require the check before merging.
- **Treat unknown agents as unknown.** A file Parmana cannot read is reported as *not evaluated*, never as passing. This is the fail-closed rule in `docs/architecture/ADR/ADR-0002-fail-closed.md`.
- **Keep approvals honest.** Parmana Core verifies each approval. The approval comes from an identified person who has completed a fresh sign-in step, as set out in `docs/architecture/ADR/ADR-0008-approval-identity-and-signing-custody.md`. An approval applies only to the commit it was given for. When the commit changes, the approval is marked superseded and a new decision is needed. *Specified, not yet built.*
- **Same input, same result.** The same commit always produces the same report. The check reads files and calls no language model, so the result does not depend on which vendor or model an agent uses. *Specified, not yet built.*
- **Prove decisions later.** Parmana Core signs each decision and links it to the one before it, so a customer can verify the record offline without trusting the vendor. The app does not sign anything itself. *Specified; depends on Parmana Core.*

## How the product fits with Parmana Core

Parmana Core is the sole authority for authorization decisions and for signing and verifying evidence. The GitHub app does not make a competing decision and does not sign anything. This follows `docs/architecture/ADR/ADR-0001-core-is-authority.md`, which is still Proposed and awaits owner acceptance.

- **The app provides:** discovery and reading of agent configuration files in repositories, comparison with the base branch to find permission changes, and publication of the GitHub check on the evaluated commit.
- **Parmana Core provides:** the decision on each change, the signature on that decision, the link to the previous record, and offline verification.

A Core outage produces fail-closed results in the app, as set out in `docs/architecture/ADR/ADR-0002-fail-closed.md`.

## Vendor and tool neutrality

Parmana does not depend on any one agent vendor or model. Each supported format has its own reader, and all readers produce the same permission model, so one policy applies across tools. Adding a format means adding a reader. It does not change customer policy.

Which formats are supported, and when, is recorded in `docs/api/AGENT-FORMAT-REGISTER.md`. A format is claimed in customer material only when its status there is **Supported**. Formats marked *Planned*, *Later* or *Candidate* are not claimed.

## What the product does not do

- It reports what agents are declared to do. It does not prove what agents actually did at runtime.
- It cannot see user-level settings or profiles on developers' own machines, such as `~/.codex/config.toml`. Its report says what it covered and what it did not.
- It treats a repository's own agent configuration as untrusted input. Settings that a tool ignores in project files are flagged, not applied.
- It does not block merges by itself. Enforcement depends on the customer's branch protection rules or rulesets.
- It does not replace IAM, branch protection, or endpoint security.

## Who it is for

- **Security administrators** who need to define what agents may do, and see when that changes.
- **Engineering administrators** who need checks visible on pull requests, without changing developer workflow.
- **Auditors** who need signed, verifiable records of each decision.

## Evidence behind each claim

| Claim | Where it is supported |
| --- | --- |
| Declared permissions are linked to source | `docs/api/CAPABILITY-SCHEMA.md` §3; test NORM-03 |
| Drift is flagged on pull requests | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-06, FR-08 |
| Approvals apply only to one commit | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-09; test AUTH-013 |
| Approvals come from an identified person | `docs/architecture/ADR/ADR-0008-approval-identity-and-signing-custody.md`; not yet tested |
| Superseded approvals stop applying | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-09; not yet tested |
| Same commit, same result | `docs/product/FUNCTIONAL-REQUIREMENTS.md`; not yet tested |
| Unknown formats are not treated as safe | `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-03 item 10, FR-04 item 5 |
| Decisions are signed and chained by Parmana Core | `docs/security/CRYPTOGRAPHIC-EVIDENCE.md`; tests CRY-001 to CRY-012; ADR-0001 |
| Checks are published only for the evaluated commit | `packages/github-client/src/rest.ts`; test GH-017, GH-018 |
| Success is never published without evidence | `packages/github-client/src/rest.ts`; test AC-10.6 |
| Supported formats and their sources | `docs/api/AGENT-FORMAT-REGISTER.md` |

Status of these claims: the GitHub integration, webhook handling, and check publication are implemented and tested. Format readers, policy evaluation, signing and offline verification are specified or in progress. Customer-facing copy must say so until they are built.

## Goals for customers

These are outcomes the product is designed to support. None is a measured result, and customer material must not present them as one.

- **Fewer surprises.** A change that gives a helper more authority is visible before it ships. Status: specified, not yet built.
- **Clearer reviews.** Reviewers see permission changes highlighted, instead of reading every settings file. Status: specified; depends on format readers and the drift engine, not yet built.
- **Quiet expansions are caught.** A small edit to a settings file is flagged on the pull request where it appears. Status: specified; depends on the drift engine, not yet built.
- **One check across tools.** Teams using several AI tools can apply one policy. Status: specified; limited to formats the register marks Supported.
- **Auditable decisions.** Each decision has a signed record that an auditor can check. Status: specified; depends on signed records, not yet built.

**The headline for a buyer:** a company can adopt AI helpers with a visible record of what they are allowed to do and what changed. Lead with this once the first format reader is in production.

## Open decision

The first release's formats are not settled. The register and ADR-0006 record Claude Code as the pilot format. Codex is marked "Later," although the owner has asked for Codex support. Until the owner decides, this document claims no format beyond what the register marks **Supported**. A decision record should set the first release.

## Non-claims for customer material

Use the wording in `docs/security/SECURITY-BOUNDARIES.md` §2. In particular, do not say that Parmana proves what an agent executed, that it prevents merges on its own, or that it covers a format the register does not mark Supported.
