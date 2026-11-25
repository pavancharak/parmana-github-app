# Decision Memo: Blocking Decisions for Phase 1

Document version: 1.0
Status: For owner decision. Nothing in this memo is accepted until the owner marks a choice in the boxes at the end and an ADR is written where required.
Decision owner: Pavan Charak
Blocks: Phase 1 (GitHub integration) and Phase 4 (Parmana Core integration)

Four decisions must be made before Phase 1 code starts. Each section gives the question, the options, a recommendation, and what the decision unblocks. The register entries are in `OPEN-DECISIONS.md` (OD-02, OD-03) and `architecture/ADR/` (ADR-0004, ADR-0005).

---

## D1. Tenant identity model (OD-02)

**Question:** Is the internal tenant key a Parmana UUID mapped to the GitHub organization ID, or the GitHub organization ID itself?

| Option | Behavior | Risk |
| --- | --- | --- |
| A. Internal UUID with unique mapping to GitHub org ID | Parmana identity is stable across org renames and reinstallations. Mapping table is an extra record to protect. | Mapping errors could attach one org's data to another. Mitigated by a unique constraint on the GitHub ID and TEN-* tests. |
| B. GitHub org ID as the primary key | Simplest. One identifier everywhere. | Org renames and deleted-then-recreated orgs can collide with old data. Changes Parmana's tenant identity when GitHub's does. |

**Recommendation:** A. Parmana identity should not depend on GitHub's naming lifecycle. The extra mapping table is small and fully testable (GH-001, GH-002, TEN-005).

**Unblocks:** tenant table schema, `TenantContext` shape (`architecture/TENANT-ISOLATION.md` §2–3), installation handling (GH-001 to GH-005), Phase 0 exit.

---

## D2. Parmana Core integration mode (OD-03)

**Question:** How does the App call Parmana Core for authorization decisions and evidence signing?

| Option | Behavior | Risk |
| --- | --- | --- |
| A. In-process SDK package from `parmana-core` | App imports Core's evaluation and signing packages. No network hop. Version pinned at build time. | Core's release cadence constrains the App. Tenant key access must still go through KMS and tenant context. |
| B. Network API to a separate Core service | Clear process boundary. Core can scale and deploy independently. | Adds latency (NFR-03 budget), a new failure mode (fail-closed paths in ADR-0002), and service authentication to build. |

**Recommendation:** A for Release 1.0. It keeps the evaluation path short, makes the version used for each decision explicit (AC-07.5), and avoids building a second service before the contract is proven. Option B can follow when Core is deployed independently. This needs confirmation from the Core maintainers (DEP-01).

**Unblocks:** Policy adapter design (`api/API-CONTRACTS.md` §5.1), evidence adapter (§5.2), Phase 4, and the choice of contract tests.

---

## D3. Durable queue technology (ADR-0004)

**Question:** Which system durably queues webhook events and retries evaluation jobs?

| Option | Pros | Cons |
| --- | --- | --- |
| A. PostgreSQL transactional outbox with leased jobs (`FOR UPDATE SKIP LOCKED`) | One durable store. Event receipt and tenant state commit in one transaction, which is the simplest way to meet "no event loss". No extra infrastructure. | Throughput ceiling. Retry and backoff logic is ours to write and test. |
| B. Redis + BullMQ | Mature retry, delay and concurrency. | Redis durability must be configured and proven. Second stateful system to back up and monitor. |
| C. Managed cloud queue (for example SQS) plus PostgreSQL state | Provider-operated durability. | Needs an outbox pattern anyway for consistency. Two systems to reconcile. |

**Recommendation:** A. It removes a whole failure class (events accepted by the queue but not recorded in tenant state), and the recovery procedure in `operations/BACKUP-RECOVERY.md` §4 stays simple. Revisit only if PERF-002 cannot be met with measured numbers.

**Unblocks:** worker design, `webhook_events` schema, PERF-002 and PERF-006 test harnesses, ADR-0004 finalization.

---

## D4. Database access layer (ADR-0005)

**Question:** Which library builds queries and manages migrations for PostgreSQL?

| Option | Pros | Cons |
| --- | --- | --- |
| A. Drizzle with SQL migrations in `database/migrations/` | Composite keys and foreign keys are explicit in code. Lightweight. Raw SQL is easy for RLS policies and immutability grants. | Smaller ecosystem than Prisma. Team must write migrations carefully. |
| B. Prisma | Mature migration tooling and generated client. | Composite constructs and RLS need raw SQL migrations. Schema language is less direct about tenant keys. |

**Recommendation:** A. The most important constraints in the product (composite tenant keys, RLS per transaction, immutability grants) are easiest to read and review as SQL and TypeScript, which matters for the security review.

**Unblocks:** `database/schema/`, migration tooling, the lint rule for `TenantContext`, TEN-012 (RLS bypass test).

---

## Decision record

**Recorded outcome (2026-11-25).** The owner directed that the best long-term options be chosen. Outcome: D1 **A**, D2 **B**, D3 **A**, D4 **A**. D2 differs from the recommendation in this memo, which favored the in-process SDK for Release 1.0. The reason for the change is in ADR-0001 item 5 and its alternatives section. The ADRs are the authoritative record. The boxes below remain for the owner's signature.

Mark one option per decision. Then the owner signs below. Each marked decision is recorded in `OPEN-DECISIONS.md` with the date, and ADR-0001, ADR-0003, ADR-0004 or ADR-0005 is updated to Accepted, as applicable.

| Decision | A | B | Other (describe) |
| --- | --- | --- | --- |
| D1 Tenant identity (OD-02) | [ ] | [ ] | |
| D2 Core integration (OD-03) | [ ] | [ ] | |
| D3 Queue (ADR-0004) | [ ] | [ ] | [ ] C |
| D4 Database access (ADR-0005) | [ ] | [ ] | |

Owner: ______________________  Date: ____________

Core maintainers confirmation for D2: ______________________  Date: ____________

## What happens after the decisions

1. Accepted ADRs are merged. Status in `architecture/ADR/README.md` is updated.
2. `OPEN-DECISIONS.md` rows are marked resolved with dates.
3. Phase 0 checklist items for tenant model, Core boundary and test strategy can be checked in `docs/README.md`.
4. Phase 1 starts with the GitHub App manifest, using `security/PERMISSION-MATRIX.md`.
