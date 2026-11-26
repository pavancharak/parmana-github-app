# Parmana Agent Permission Control — Documentation Index

Status: **Phase 0 — Architecture and contracts (proposed, not frozen)**
Document version: 1.0
Owner: Pavan Charak (product and security decisions)

This folder is the engineering baseline that must exist **before any application code is written**. It follows the documentation layout in §12 of the product specification, plus the user stories, API contracts and open-decision register that Phase 0 requires.

## Rule of precedence

1. Product requirements (`product/`) define *what* must be true.
2. Architecture and security documents define *how* the system is bounded.
3. API and schema documents define the *contracts* code must satisfy.
4. Testing documents define *how each requirement is proven*.
5. Operations documents define *how the service is run and recovered*.

If two documents conflict, the conflict is a defect. Record it in `product/OPEN-DECISIONS.md` and resolve it through an ADR before implementation.

## Map

| Folder | Document | Purpose |
| --- | --- | --- |
| `product/` | [PRD.md](product/PRD.md) | Vision, scope, personas, success metrics, release 1.0 scope |
| `product/` | [FUNCTIONAL-REQUIREMENTS.md](product/FUNCTIONAL-REQUIREMENTS.md) | FR-01 to FR-13 with rationale and requirement IDs |
| `product/` | [NON-FUNCTIONAL-REQUIREMENTS.md](product/NON-FUNCTIONAL-REQUIREMENTS.md) | NFR-01 to NFR-12 and operational targets |
| `product/` | [ACCEPTANCE-CRITERIA.md](product/ACCEPTANCE-CRITERIA.md) | Testable acceptance criteria per requirement |
| `product/` | [USER-STORIES.md](product/USER-STORIES.md) | User stories by persona with acceptance links |
| `product/` | [OPEN-DECISIONS.md](product/OPEN-DECISIONS.md) | Decisions that need owner input before Phase 1 |
| `architecture/` | [SYSTEM-ARCHITECTURE.md](architecture/SYSTEM-ARCHITECTURE.md) | Components, boundaries, data flows, failure modes |
| `architecture/` | [DATA-MODEL.md](architecture/DATA-MODEL.md) | Entities, keys, constraints, immutability rules |
| `architecture/` | [TENANT-ISOLATION.md](architecture/TENANT-ISOLATION.md) | Tenant identity, scoping, RLS, queues, caches |
| `architecture/` | [GITHUB-INTEGRATION.md](architecture/GITHUB-INTEGRATION.md) | Webhooks, installations, checks, commit binding |
| `architecture/ADR/` | [ADR index](architecture/ADR/README.md) | Architecture decision records |
| `api/` | [API-CONTRACTS.md](api/API-CONTRACTS.md) | External and internal API contracts |
| `api/` | [AGENT-FORMAT-REGISTER.md](api/AGENT-FORMAT-REGISTER.md) | Supported agent configuration formats, with status and release |
| `api/` | [CAPABILITY-SCHEMA.md](api/CAPABILITY-SCHEMA.md) | Canonical capability schema v1.0 |
| `api/` | [POLICY-SCHEMA.md](api/POLICY-SCHEMA.md) | Policy schema v1.0 and evaluation semantics |
| `api/` | [EVIDENCE-SCHEMA.md](api/EVIDENCE-SCHEMA.md) | Evidence record schema v1.0 and verification |
| `security/` | [THREAT-MODEL.md](security/THREAT-MODEL.md) | STRIDE threat model and trust boundaries |
| `security/` | [SECURITY-BOUNDARIES.md](security/SECURITY-BOUNDARIES.md) | Security invariants and what is out of scope |
| `security/` | [PERMISSION-MATRIX.md](security/PERMISSION-MATRIX.md) | Minimal GitHub App permissions and role matrix |
| `security/` | [CRYPTOGRAPHIC-EVIDENCE.md](security/CRYPTOGRAPHIC-EVIDENCE.md) | Signing, hash chaining, key management, verification |
| `testing/` | [TEST-STRATEGY.md](testing/TEST-STRATEGY.md) | Test levels, gates, tooling, CI mapping |
| `testing/` | [TEST-CASES.md](testing/TEST-CASES.md) | UT, GH, AUTH, TEN, CRY test case catalogue |
| `testing/` | [E2E-SCENARIOS.md](testing/E2E-SCENARIOS.md) | End-to-end customer journeys E2E-001 to E2E-007 |
| `testing/` | [SECURITY-TEST-PLAN.md](testing/SECURITY-TEST-PLAN.md) | Security assessments and attack suites |
| `product/` | [GAP-REGISTER.md](product/GAP-REGISTER.md) | Everything still to build, with blockers and done-when tests |
| `product/` | [VALUE-PROPOSITION.md](product/VALUE-PROPOSITION.md) | Value proposition, with the status of each claim |
| `architecture/ADR/` | [ADR-0006](architecture/ADR/ADR-0006-pilot-scope.md) | Pilot scope before Release 1.0 (proposed) |
| `operations/` | [DEPLOYMENT.md](operations/DEPLOYMENT.md) | Environments, release and rollback |
| `operations/` | [MONITORING.md](operations/MONITORING.md) | Metrics, logs, traces, alerts |
| `operations/` | [BACKUP-RECOVERY.md](operations/BACKUP-RECOVERY.md) | Backup, restore, RPO and RTO targets |
| `operations/` | [INCIDENT-RESPONSE.md](operations/INCIDENT-RESPONSE.md) | Severity model, response roles, runbooks |
| `operations/` | [PRODUCTION-READINESS.md](operations/PRODUCTION-READINESS.md) | Release gates and go-live checklist |

## Phase 0 exit checklist

Phase 0 is complete only when every item is true. Items marked *open* are tracked in `product/OPEN-DECISIONS.md`.

Status: the documentation baseline was merged in PR #1 (commit `ec76eb7`). The items below stay unchecked until the owner has reviewed the open decisions.

- [ ] All schemas (capability, policy, evidence, webhook events) are versioned and reviewed.
- [ ] Tenant identity model is approved by the owner.
- [ ] Parmana Core integration boundary is documented and agreed with the Core maintainers.
- [ ] GitHub App permissions are minimized and justified in `security/PERMISSION-MATRIX.md`.
- [ ] Security invariants are documented in `security/SECURITY-BOUNDARIES.md`.
- [ ] Threat model reviewed.
- [ ] Test strategy approved, and every requirement ID maps to at least one test case.
- [ ] Every open decision is either resolved by an ADR or explicitly deferred with an owner and date.

## Conventions

- Requirement IDs (`FR-xx`, `NFR-xx`), test IDs (`UT-`, `GH-`, `AUTH-`, `TEN-`, `CRY-`, `E2E-`, `PERF-`) and story IDs (`US-xx`) are stable. Never reuse an ID. Deprecate instead.
- Every schema change bumps its version. Breaking changes require a new major version and an ADR.
- Documents state what is *required*. They do not claim measured performance. Measured results go to a separate results log once they exist.
- Anything not yet decided is written as **TBD** with a link to an open decision, never silently assumed.
