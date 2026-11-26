# ADR-0007: Plan entitlements and report-only mode

Status: Accepted (decision delegated by the owner, 2026-11-26)
Date: 2026-11-26
Decision owner: Pavan Charak (delegated the technical decision; prices and caps remain owner decisions in `docs/product/PRICING.md`)

## Context

Pricing tiers (`docs/product/PRICING.md`) limit how many repositories a customer can monitor, and the Free tier runs in report-only mode. Two things must be decided before code is written:

1. Where a customer's plan is stored and who may change it.
2. Whether a plan setting may turn a check off. `docs/operations/DEPLOYMENT.md` §6 says "a flag that disables a check is prohibited", which conflicts with report-only mode unless the two are defined separately.

GitHub bills only by flat rate or per user, so Parmana enforces the repository cap itself.

## Decision

1. **Entitlements are a Parmana record per tenant.** A tenant's plan, repository cap and mode live in a tenant-scoped table under row-level security (ADR-0003). Only GitHub Marketplace purchase and plan-change events, received as signed webhooks, may write the plan. No user, API call or repository setting may write it.
2. **Missing or unreadable entitlements fall back to the Pilot tier:** one repository, report-only. An unknown plan never grants a higher tier (ADR-0002, fail closed).
3. **Report-only is a defined mode, not a skipped check.** Every evaluation still runs, evidence is still recorded, and the check reports `neutral` with the would-be result in its summary (FR-14). Report-only never publishes `failure`.
4. **Enforced mode is set only by the plan record.** A repository cannot switch its own mode. Changing mode from report-only to enforced requires an owner action and an audit entry (FR-14 item 4).
5. **Repository cap is checked when a repository is first monitored.** A repository over the cap is not monitored. Its check reports `neutral` and names the plan limit, so the skip is visible on the pull request.
6. **Downgrades take effect at the end of the billing period.** Monitored repositories keep running until then. Parmana does not switch off monitoring mid-period.
7. **Every plan change is written to the audit trail** with the event ID and the old and new values.

This replaces the wording in `DEPLOYMENT.md` §6. The rule becomes: a plan or mode setting may make a check report `neutral`; no setting may skip evaluation or evidence.

## Consequences

- Schema: one entitlements table and one plan-event log, both with RLS. Added to `database/migrations` in a later migration.
- Webhook handling: marketplace events are verified with the same HMAC check as other events.
- Check run: the summary states the mode and any plan limit.
- Customers cannot buy their way out of enforcement, and cannot be enforced without a plan. Both states are visible in the audit trail.

## Alternatives considered

- **Feature flags per tenant.** Rejected. A flag could turn off a check, which the deployment rule forbids, and flags have no audit trail by default.
- **Enforce the cap by counting monitored repositories in GitHub billing.** Not possible; GitHub does not bill by repository.
- **Silently skip over-cap repositories.** Rejected. A skipped check with no message would hide a gap from the customer.

## Tests or documents affected

- `docs/operations/DEPLOYMENT.md` §6: wording replaced as described above.
- `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-14: add plan-limit acceptance (over-cap repository reports `neutral`).
- `docs/product/GAP-REGISTER.md`: G-76 to G-78 added.
- `docs/product/PRICING.md`: the open decisions list links to this ADR.
- Tests to add: ENT-001 (unknown plan falls back to Pilot), ENT-002 (report-only never publishes failure), ENT-003 (over-cap repository reports neutral with limit named), ENT-004 (mode change without owner action is refused and audited), ENT-005 (downgrade takes effect at period end).
