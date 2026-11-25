# User Stories

Document version: 1.0
Format: As a *role*, I want *capability*, so that *outcome*. Each story lists the requirements it realizes and the scenarios that prove it.

## Organization Owner

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-01 | As an Organization Owner, I want to install Parmana on my GitHub organization with no manual credential setup, so that onboarding takes minutes. | FR-01 | E2E-001 |
| US-02 | As an Organization Owner, I want to choose which repositories Parmana can read, so that I control its reach. | FR-01 | GH-003, E2E-001 |
| US-03 | As an Organization Owner, I want Parmana to stop processing when I uninstall it, so that I know access has ended. | FR-01 | GH-004, GH-005 |
| US-04 | As an Organization Owner, I want installation history visible to me, so that I can audit who connected and disconnected the App. | FR-01, FR-13 | AUD-01 |

## Security Administrator

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-05 | As a Security Administrator, I want to define the policy that governs agent capabilities, so that the organization's authority is explicit. | FR-07 | AUTH-001, AUTH-002 |
| US-06 | As a Security Administrator, I want every policy change versioned and attributable, so that I can explain historical decisions. | FR-07, FR-13 | AUTH-006, AUTH-010 |
| US-07 | As a Security Administrator, I want unknown capabilities denied by default, so that new tools cannot slip through. | FR-04, FR-07 | UT-012, AUTH-004 |
| US-08 | As a Security Administrator, I want critical drift notifications, so that I can respond quickly. | FR-12 | NOT-01 |
| US-09 | As a Security Administrator, I want to review and approve the initial capability baseline, so that discovered declarations are not automatically trusted. | FR-05 | BASE-01, AC-05.1 |

## Engineering Administrator

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-10 | As an Engineering Administrator, I want to see which repositories contain agent configurations, so that I know what is in scope. | FR-03, FR-11 | UT-001, DASH-01 |
| US-11 | As an Engineering Administrator, I want enforcement to be visible as a GitHub Check on the PR, so that developers see the result where they work. | FR-08 | GH-017, E2E-002 |
| US-12 | As an Engineering Administrator, I want deleted or renamed agent files reconciled, so that the inventory matches the repository. | FR-03 | GH-012, GH-013 |

## Approver

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-13 | As an Approver, I want to see exactly what capability changed and which commit it applies to, so that I approve the right thing. | FR-09 | E2E-003 |
| US-14 | As an Approver, I want my approval to expire, so that stale approvals do not authorize later work. | FR-09 | AUTH-014 |
| US-15 | As an Approver, I want a new commit to invalidate my earlier approval, so that changes cannot slip past review. | FR-09 | E2E-004, AUTH-013 |
| US-16 | As an Approver, I want my approval recorded with a reason, so that the decision is auditable. | FR-09, FR-10 | AUD-01, CRY-001 |

## Developer

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-17 | As a Developer, I want a clear failing check with a reason when my PR expands agent authority, so that I know what to change. | FR-08 | E2E-002 |
| US-18 | As a Developer, I want my check to re-evaluate on each push, so that fixes are picked up automatically. | FR-08 | GH-010 |
| US-19 | As a Developer, I want a link from the check to the evidence record, so that I can see the decision basis. | FR-08, FR-10, FR-12 | NOT-04 (Phase 5) |
| US-20 | As a Developer, I want to be notified when my PR check fails, so that I do not miss it. | FR-12 | NOT-01, NOT-04 |

## Auditor

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-21 | As an Auditor, I want read-only access to policies, decisions and evidence, so that I can review without changing them. | FR-11, FR-13 | RBAC-02 |
| US-22 | As an Auditor, I want to export evidence for a period, so that I can give it to an external reviewer. | FR-10, FR-13 | AUD-03, E2E-007 |
| US-23 | As an Auditor, I want to verify an evidence bundle without contacting Parmana, so that I do not depend on the vendor. | FR-10 | E2E-007, CRY-011 |

## Customer as a whole

| ID | Story | Requirements | Proof |
| --- | --- | --- | --- |
| US-24 | As an organization, I want assurance that no other organization can see my data, so that I can adopt the product. | FR-02 | TEN-001 to TEN-012, E2E-005 |
| US-25 | As an organization, I want Parmana to fail closed if it is unavailable, so that outages cannot silently weaken enforcement. | FR-08 | E2E-006 |

## Story-to-requirement coverage

Every functional requirement must have at least one story. FR-02 is covered by US-24. FR-06 (drift) is covered indirectly by US-07, US-08 and US-10, and must receive a dedicated story in v1.1 before Phase 3 exits. This gap is tracked as OD-10.
