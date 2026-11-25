# Open Decisions Register

Document version: 1.0
A decision is **open** until an ADR is accepted (`architecture/ADR/`) or the owner records a decision here. Phase 1 must not start for an area whose blocking decision is open.

| ID | Decision needed | Options | Blocks | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| OD-01 | Exact list of supported configuration formats and their versions for Release 1.0 | Minimal set (Claude Code, AGENTS.md, Copilot instructions, MCP JSON, workflows) or extended | Phase 2 | Pavan Charak | Open |
| OD-02 | Tenant identity model | (a) Internal UUID mapped to GitHub org ID; (b) GitHub org ID as primary key | Phase 0 exit | Pavan Charak | Resolved 2026-11-25: (a). See TENANT-ISOLATION §2 |
| OD-03 | Parmana Core integration mode | (a) In-process SDK; (b) network API with Core as a separate service | Phase 4 | Pavan Charak with Core maintainers | Resolved 2026-11-25: (b), recorded in ADR-0001 item 5. Core maintainers to confirm the API contract |
| OD-04 | Human approval identity for approvers | GitHub OAuth only; GitHub OAuth plus step-up or signed approval | Phase 5 | Pavan Charak | Open |
| OD-05 | Signing key custody | AWS KMS per tenant; KMS with envelope keys; other HSM | Phase 4 | Pavan Charak | Open (recommendation: KMS) |
| OD-06 | Retention and deletion periods for evidence versus tenant data | Per-tenant configuration with a floor set by legal review | Phase 6 | Pavan Charak and counsel | Open |
| OD-07 | RPO and RTO targets | Values to be proposed after architecture review | Phase 7 | Pavan Charak | Open |
| OD-08 | Two-person approval policy default | Off by default; on for Critical drift only | Phase 5 | Pavan Charak | Open |
| OD-09 | Compliance certifications in scope and timing | None for 1.0; SOC 2 Type I after first customer | Phase 7 | Pavan Charak | Open |
| OD-10 | Dedicated user story for drift detection (FR-06) | Add US-26 in v1.1 | Phase 3 exit | Product | Open |
| OD-11 | Repository for the Core dependency: is `parmana-core` the only integration target, or are SDK packages published separately? | Monorepo package versus published package | Phase 4 | Pavan Charak | Open |
| OD-12 | Dashboard framework | Next.js per spec; confirm hosting | Phase 6 | Pavan Charak | Open (spec default: Next.js) |
| OD-13 | Representation of "production access" in policy. The spec's example uses `capability: production_access`, which is not in the capability enum | (a) Map to `secret_access` or `external_service` with a `target` attribute; (b) add a `production_access` capability type in CAPABILITY-SCHEMA v1.1 | Phase 3 | Pavan Charak | Open (recommendation: a) |
| OD-14 | Queue and database access technology | ADR-0004 and ADR-0005 | Phase 1 | Pavan Charak | Resolved 2026-11-25: outbox on PostgreSQL (ADR-0004); Drizzle (ADR-0005) |

## Resolution procedure

1. Write the options and a recommendation in the row.
2. Owner decides, or delegates in writing.
3. Create an ADR under `architecture/ADR/` for any decision that changes an architectural boundary.
4. Update the row's status with the ADR number and date.
