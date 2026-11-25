# Product Requirements Document — Parmana Agent Permission Control

Document version: 1.0
Status: Proposed engineering baseline
Company: Parmana Systems
Product: Parmana Agent Permission Control (the "Product" or "Parmana GitHub App")
Core dependency: `pavancharak/parmana-core`

## 1. Vision

Build a production-ready GitHub App that helps organizations discover AI agent configurations, establish approved capability baselines, detect unauthorized permission changes, enforce organizational policies and maintain independently verifiable evidence.

Each GitHub organization receives an isolated Parmana workspace.

The Product must answer five questions:

1. Which AI agents and agent configurations exist in our repositories?
2. What capabilities have been declared for each agent?
3. What capabilities has the organization authorized?
4. Has an agent's declared authority changed?
5. Can we prove that a change was evaluated and approved or rejected?

## 2. Core product guarantee

> Parmana detects changes to declared agent capabilities, evaluates them against organizational authority and enforces the resulting decision at configured GitHub control points.

Four distinctions bind every requirement in this folder:

- **Configuration discovery** establishes what is *declared*.
- **Policy evaluation** establishes what is *authorized*.
- **GitHub checks** enforce *repository workflow* decisions.
- **Runtime integrations** are required to establish and enforce *actual runtime* permissions.

The Product must never claim that scanning repository files proves what an agent actually executed.

## 3. Scope

### 3.1 Included in Release 1.0

| Area | Included |
| --- | --- |
| Installation | GitHub App installation on organizations |
| Discovery | Agent configuration discovery in supported formats |
| Inventory | Capability inventory with source references |
| Drift | Permission drift detection against an approved baseline |
| Authorization | Deterministic policy evaluation, integrated with Parmana Core |
| Enforcement | Pull request Check Runs |
| Approvals | Human approval workflow for exceptional changes |
| Evidence | Cryptographic evidence and offline verification |
| Dashboard | Organization dashboard for administrators and auditors |
| Operations | RBAC, audit trail, monitoring |

### 3.2 Explicitly not included in Release 1.0

- Controlling every AI agent runtime.
- Intercepting arbitrary shell commands.
- Model behavior evaluation.
- Full endpoint security platform.
- Replacing IAM.
- Replacing GitHub branch protection.
- Automatic approval of risky changes.
- Claiming evidence proves unobserved execution.
- Direct runtime agent interception, automatic remediation, advanced risk scoring, multiple runtime integrations, dedicated enterprise infrastructure (deferred; see §8).

## 4. Objectives and success metrics

| Objective | Measurement | Initial target |
| --- | --- | --- |
| Installation | Successful organization installations | 100% successful test installations |
| Discovery | Supported configuration detection | 95%+ on benchmark corpus |
| Drift detection | Correctly detected benchmark changes | 100% |
| Authorization | Deterministic policy outcomes | 100% repeatability |
| Tenant isolation | Cross-tenant access tests | Zero unauthorized access |
| Webhook reliability | Successfully processed valid events | 99.9% target |
| Evidence | Offline verification of generated records | 100% of valid test records |
| Enforcement | Correct required check outcomes | 100% of acceptance scenarios |
| Recovery | Retry without duplicate decisions | Idempotent processing |

These are **engineering targets, not claims of achieved production performance.** No result in this folder is measured data.

## 5. Personas and roles

| Role | Responsibilities |
| --- | --- |
| Organization Owner | Connect GitHub, manage workspace and billing |
| Security Administrator | Define policies and review risk |
| Engineering Administrator | Configure repositories and enforcement |
| Approver | Approve designated capability changes |
| Developer | View findings and submit PRs |
| Auditor | Read policies, decisions and evidence |

Role-to-permission mapping is defined in `security/PERMISSION-MATRIX.md`. User journeys are in `product/USER-STORIES.md`.

## 6. Success definition

### 6.1 Definition of done for the first customer

- A customer can install Parmana on its GitHub organization.
- Its repositories and agent configurations are discovered.
- An administrator can approve an authority baseline.
- A developer can introduce a permission change through a PR.
- Parmana can detect and evaluate that change.
- Unauthorized changes fail the configured GitHub check.
- Authorized exceptions require valid human approval.
- Every completed decision produces verifiable evidence.
- The customer can independently verify that evidence.
- No customer can access another customer's data.
- The application survives documented failure and recovery scenarios.

### 6.2 Ultimate acceptance test

A real organization installs Parmana, introduces an unauthorized agent permission expansion, and Parmana detects it, rejects it, prevents merging through GitHub's configured protection rules and produces independently verifiable evidence.

This test is reproduced as scenario E2E-002 plus E2E-007 in `testing/E2E-SCENARIOS.md`.

## 7. Engineering priorities

Relative implementation priority, not estimated effort:

| Priority | Area |
| --- | --- |
| 10 | Tenant isolation |
| 10 | GitHub integration |
| 10 | Authorization |
| 10 | Evidence integrity |
| 7.5 | Drift detection |
| 5 | Approvals |
| 2.5 | Dashboard |
| 0 | Notifications |

Three non-negotiable engineering invariants:

1. **No tenant context, no access.**
2. **No valid authorization, no successful enforcement check.**
3. **No verifiable evidence, no claim of completed proof.**

These invariants are restated as testable rules in `security/SECURITY-BOUNDARIES.md`.

## 8. Release boundaries

**Release 1.0 must ship:** GitHub organization installation; isolated workspace; agent discovery; capability normalization; approved baseline management; drift detection; deterministic Parmana Core authorization; PR Check Run enforcement; human approval workflow; signed evidence and offline verification; organization dashboard; RBAC, audit and monitoring.

**Deferred:** direct runtime agent interception; automatic agent remediation; advanced analytics and risk scoring; multiple external agent runtime integrations; enterprise dedicated infrastructure.

This keeps the first release from becoming an oversized AI security platform.

## 9. Dependencies and assumptions

| ID | Dependency or assumption | Impact if false | Tracked in |
| --- | --- | --- | --- |
| DEP-01 | Parmana Core exposes a stable SDK or API for authorization, signing and verification | Phase 4 blocked; no duplicate engine permitted | OD-03 |
| DEP-02 | GitHub App API supports Check Runs, installation lifecycle events and repository-scoped tokens | Enforcement design changes | GITHUB-INTEGRATION.md |
| DEP-03 | AWS KMS (or equivalent) is available for tenant signing keys | Signing design changes | OD-05 |
| DEP-04 | Customers configure branch protection or rulesets to require the Check Run | Merge prevention not guaranteed by Parmana | PRD §2, E2E-002 |
| ASM-01 | Supported configuration formats are documented before parsers are written | Discovery scope unbounded | FR-03, OD-01 |
