# ADR-0001: Parmana Core is the sole authorization and signing authority

Status: Accepted (2026-11-25, owner decision)
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

The product specification requires that Parmana Core remain the source of truth for authority decisions and cryptographic proof, and that the App not create a competing authorization engine (FR-07.9, Phase 4 exit criteria). Two engines would produce divergent decisions and undermine the evidence claim.

## Decision

1. Authorization decisions are produced only by Parmana Core through the policy adapter.
2. Evidence signing and verification use Parmana Core crypto and evidence packages.
3. The App may pre-filter (for example, reject a schema-invalid record before calling Core) but never converts a Core decision into a different decision.
4. Core's decision format, policy digest and evidence format are consumed as versioned contracts (`api/POLICY-SCHEMA.md`, `api/EVIDENCE-SCHEMA.md`).
5. Core runs as a **separate service** and is called through a versioned network API over mutual TLS (`api/API-CONTRACTS.md` §5). Core alone holds signing access to tenant keys. The App process never holds signing capability. This decision is the resolution of OD-03.

## Consequences

- Core's API must be stable before Phase 4 (DEP-01). Contract version 1.0 is frozen with this ADR.
- Core is deployed and scaled independently, and must meet the 500 ms evaluation budget (NFR-03) across the network.
- A Core outage produces fail-closed results (ADR-0002).
- Cross-repository change coordination is required when Core's contract changes.

## Alternatives considered

- Implement a local policy evaluator in the App: rejected, creates a second authority and duplicates audit scope.
- In-process SDK (the earlier Phase 0 recommendation): rejected for the long term. It places tenant signing access inside the App process, which weakens boundaries B6 and B8 in `architecture/SYSTEM-ARCHITECTURE.md`, and it couples Core's release cadence to the App's. The network boundary costs latency and one more service, which we accept.

## Tests or documents affected

`architecture/SYSTEM-ARCHITECTURE.md`, `api/POLICY-SCHEMA.md`, `api/EVIDENCE-SCHEMA.md`, tests AUTH-*, CRY-*.
