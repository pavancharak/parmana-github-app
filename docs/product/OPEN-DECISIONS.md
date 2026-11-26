# Open Decisions Register

Document version: 1.1
Status as of 2026-11-26.

A decision is **open** until an ADR is accepted (`architecture/ADR/`) or the owner records a decision here. Phase 1 must not start for an area whose blocking decision is open.

Status key: **Decided** (owner decision recorded), **Decided, confirmation pending** (decision made, an outside party must confirm), **Open** (needs input before the stated phase).

| ID | Decision needed | Decision (2026-11-26) | Blocks | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| OD-01 | Supported configuration formats for Release 1.0 | Pilot: `.claude/settings.json` only (ADR-0006). Release 1.0: Claude Code settings, `AGENTS.md`, Copilot instructions, MCP JSON and GitHub Actions workflows. Each format has a versioned parser. Any other format is reported as unsupported, never analysed. | Phase 2 | Pavan Charak | Decided |
| OD-02 | Tenant identity model | (a) Internal UUID mapped to the GitHub organization ID. Recorded in `DECISION-MEMO-PHASE1.md` (D1), owner confirmed 2026-11-25. | Phase 0 exit | Pavan Charak | Decided |
| OD-03 | Parmana Core integration mode | (b) Core runs as a separate service behind a versioned network API over mutual TLS. Only Core holds tenant signing access. Recorded in the Phase 1 memo (D2). | Phase 4 | Pavan Charak with Core maintainers | Decided, confirmation pending (Core maintainers, issue #782, requested by 2026-12-09) |
| OD-04 | Human approval identity | GitHub OAuth sign-in, plus step-up re-authentication within 5 minutes before any approval is recorded. Signed approval through Core is planned for a later release. See ADR-0008. | Phase 5 | Pavan Charak | Decided |
| OD-05 | Signing key custody | AWS KMS, one customer-managed key per tenant, used only by Core. See ADR-0008. | Phase 4 | Pavan Charak | Decided |
| OD-06 | Retention and deletion periods | Design decided: retention is per tenant, stored in the tenant record, and cannot be set below the floor. Evidence is never deleted before its retention period ends. The floor values (and the pricing retention periods of 90 days and one year) need counsel review before publishing. | Phase 6 | Pavan Charak and counsel | Decided. Counsel approved the retention floor and the per-plan periods on 2026-11-26: Pilot 3 days, Team 7 days, Business 60 days, Enterprise custom by contract. Design unchanged: retention per tenant, never below the floor, evidence never deleted before its period ends. |
| OD-07 | RPO and RTO targets | RPO 15 minutes (RDS point-in-time recovery enabled). RTO 4 hours for the pilot and Release 1.0. Review after the first restore rehearsal in staging. | Phase 7 | Pavan Charak | Decided |
| OD-08 | Two-person approval default | Off by default. On for Critical drift only. Tenant administrators may change it. | Phase 5 | Pavan Charak | Decided |
| OD-09 | Compliance certifications | None for Release 1.0. SOC 2 Type I begins after the first paying customer. | Phase 7 | Pavan Charak | Decided |
| OD-10 | Dedicated user story for drift detection (FR-06) | Add US-26 in v1.1, not before. | Phase 3 exit | Product | Decided (v1.1) |
| OD-11 | Core integration target | `parmana-core` is the only integration target. No SDK package is published in Release 1.0. Integration is through the network API in OD-03. | Phase 4 | Pavan Charak | Decided |
| OD-12 | Dashboard framework | Next.js, as in the spec, hosted on AWS in ap-south-1 alongside the App. | Phase 6 | Pavan Charak | Decided |
| OD-13 | Representation of "production access" in policy | (a) Map to `secret_access` or `external_service` with a `target` attribute. No new capability type in CAPABILITY-SCHEMA v1.0. | Phase 3 | Pavan Charak | Decided |
| OD-14 | Queue and database access technology | Per the Phase 1 memo (D3, D4): PostgreSQL transactional outbox behind a `JobQueue` interface (ADR-0004), and Drizzle with reviewed SQL migrations (ADR-0005). | Phase 1 | Pavan Charak | Decided (memo D3, D4) |
| OD-15 | Pilot scope (ADR-0006) | Approved as written: one repository, `.claude/settings.json`, one rule, two weeks of dry-run, manual approval, unsigned records. | Pilot start | Pavan Charak | Decided |

## Decision log

| Date | Decision | Recorded in |
| --- | --- | --- |
| 2026-11-25 | D1 tenant identity (OD-02), D3 queue (OD-14), D4 database access (OD-14) accepted; D2 Core integration (OD-03) accepted, pending Core confirmation | `DECISION-MEMO-PHASE1.md` on `claude/phase1-decision-memo` |
| 2026-11-26 | OD-01, OD-04 to OD-13, OD-15 decided | This file, ADR-0008 |
| 2026-11-26 | Plan entitlements and report-only mode | ADR-0007 |
| 2026-11-26 | Decision-record retention per plan: Pilot 3 days, Team 7 days, Business 60 days, Enterprise custom by contract. Counsel approved the floor and these periods on 2026-11-26 (OD-06) | `PRICING.md` (owner decision, recorded here) |

## Resolution procedure

1. Write the options and a recommendation in the row.
2. Owner decides, or delegates in writing.
3. Create an ADR under `architecture/ADR/` for any decision that changes an architectural boundary.
4. Update the row's status with the ADR number and date.
