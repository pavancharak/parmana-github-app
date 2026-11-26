# Product roadmap

Status as of 2026-11-26. Each stage has a goal, what it delivers, and what must be true before the next stage starts. Dates are not set; each stage starts when its entry conditions are met.

Customer-facing summary: see the final copy in `STORY.md`. Detailed work items: see `GAP-REGISTER.md`.

## Stage 1: Pilot (first milestone)

**Goal:** prove the core story with one design partner.

**Delivers**
- One code repository, chosen by the partner.
- One settings file type: `.claude/settings.json`.
- One rule: any change that adds deploy, command or outside-connection access needs one named approver.
- Report-only mode for two weeks, then an owner decision on enforcement.
- Manual approval, tied to the exact version of the change.
- Decisions stored, marked as unsigned.
- One administrator sign-in.

**Before this starts**
- The service is running on a public address.
- The GitHub app is connected to it.
- The account restriction is lifted.

**Done when**
- The rule blocks a real change on the test repository, and an approval clears it.
- The partner completes two weeks of report-only use with no unexplained blocks.

## Stage 2: Release 1.0 (general availability)

**Goal:** make Parmana usable by any customer.

**Delivers**
- All settings file types the company uses.
- Multiple repositories, across the whole organization: each repository has its own report-only or enforced setting, and the company sees one inventory for all of them.
- The full policy engine, with rule ordering.
- Enforcement through the company's branch rules.
- Full approval workflow: expiry, no reuse, and two-person approval for sensitive rules.
- Signed, linked decision records, with export and offline verification.
- Role-based access for each job role.
- The dashboard: inventory, changes, approvals, records.
- Notifications for blocked and waiting changes.

**Before this starts**
- Stage 1 is complete and the owner has decided enforcement.
- The policy engine's contract is confirmed by the engine team.
- Decisions on signing keys and data retention are made.

**Done when**
- Each feature passes its tests in the test plan.
- A security review and an independent penetration test show no open high or critical findings.
- A restore from backup is tested.

### Multiple repositories (Release 1.0)

Details of how multiple repositories work, so the rule is the same everywhere:

- **Installation choice.** A company picks "all repositories" or "selected repositories" when installing the app. Parmana only reads what it is given.
- **One rule, applied per repository.** A company sets its rule once, and can override it for a single repository, for example to start report-only on a new one.
- **Separate history per repository.** Each repository keeps its own record of decisions, so one team's changes never mix with another's.
- **One view for leaders.** The dashboard shows every repository, which helpers they contain, and what is waiting for approval.
- **Added and removed repositories.** A repository added later starts in report-only mode. A removed one keeps its history, but stops being checked.

Not in the pilot: the pilot covers one repository, as approved in ADR-0006. Multiple repositories start when Stage 2 begins.

## Stage 3: Later

Not planned for Release 1.0. Each item needs its own decision before work starts.

- Intercepting what agents actually do at runtime. Parmana reports what is declared, not what runs.
- Automatic fixes to risky changes.
- Advanced risk scores.
- Settings from more than one helper vendor beyond the first release's formats.
- Dedicated infrastructure for large enterprises.

## What customers see at each stage

| Stage | Customers can | Customers cannot |
| --- | --- | --- |
| Pilot | Use one repository in report-only mode, approve changes manually | Rely on enforcement, signed records or a dashboard |
| Release 1.0 | Enforce rules across all their repositories, verify records offline, use the dashboard | Use runtime monitoring or automatic fixes |

## Open questions

- Which settings file types come first after the pilot. Owner decision.
- Retention periods for records. Owner and counsel.
- Signing key ownership. Owner decision.
