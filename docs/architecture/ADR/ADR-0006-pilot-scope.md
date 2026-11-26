# ADR-0006: Pilot scope before Release 1.0

Status: Proposed, for owner decision
Date: 2026-11-26
Decision owner: Pavan Charak

## Context

The product specification (`docs/product/PRD.md` §13) defines Release 1.0 as twelve must-ship items. The gap register (`docs/product/GAP-REGISTER.md`) lists more than sixty items still to build, several of which are blocked by outside parties: the AWS account restriction, the Core team's API confirmation, and open owner decisions.

Building all of Release 1.0 before any customer sees the product is the wrong order. It delays the test that matters most: whether a company will act on a blocked change.

## Decision (proposed)

Define a **pilot** milestone that proves one story end to end, ahead of Release 1.0.

The pilot delivers:

1. **One repository,** chosen by a design partner.
2. **One settings format:** `.claude/settings.json`. This closes OD-01 for the pilot only.
3. **One rule:** any change that adds deploy, shell or outbound network permission needs one named approver before it can pass.
4. **Dry-run mode for the first two weeks.** The check reports what it would block but never fails a pull request. This is FR-14 (proposed).
5. **Manual approval through an internal endpoint,** bound to the exact commit. No dashboard.
6. **Decisions stored in the database, marked unsigned.** Signed evidence is deferred. Customer material must not claim signed proof during the pilot.
7. **One administrator sign-in,** through GitHub OAuth. Full role-based access is deferred.

The pilot excludes: the dashboard, notifications, more than one settings format, the offline verifier, the export bundle, two-person approval, and multi-tenant administration beyond one organisation.

## Exit criteria for the pilot

- E2E-002 and E2E-003 pass on the test repository, with the rule applied to a real pull request.
- The design partner completes two weeks of dry-run with no false blocks that they couldn't explain.
- The owner decides whether to enforce, and which formats and rules come next.

## Consequences

- Release 1.0 stays the target. Its scope is unchanged until the pilot results are reviewed.
- The value proposition must mark signed records and the dashboard as Release 1.0 features, not pilot features.
- The gap register's critical path is the pilot path. Items outside it move to Release 1.0 unless the owner says otherwise.

## Alternatives considered

- **Build all of Release 1.0 first.** Rejected: too long before any real feedback, and several items depend on outside parties.
- **Pilot without dry-run.** Rejected: a first real block can stop a team's work, and trust would drop.
- **Pilot with signed evidence.** Rejected for now: it adds the Core signing dependency (G-41) to the critical path.

## Documents affected

`PRD.md` (new §14), `FUNCTIONAL-REQUIREMENTS.md` (FR-14), `OPEN-DECISIONS.md` (OD-01 proposal, OD-15), `VALUE-PROPOSITION.md` (pilot-status column), `docs/README.md` (links).
