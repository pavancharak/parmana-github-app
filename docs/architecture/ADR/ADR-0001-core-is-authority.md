# ADR-0001: Parmana Core is the sole authorization and signing authority

Status: Proposed
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

The product specification requires that Parmana Core remain the source of truth for authority decisions and cryptographic proof, and that the App not create a competing authorization engine (FR-07.9, Phase 4 exit criteria). Two engines would produce divergent decisions and undermine the evidence claim.

## Decision

1. Authorization decisions are produced only by Parmana Core through the policy adapter.
2. Evidence signing and verification use Parmana Core crypto and evidence packages.
3. The App may pre-filter (for example, reject a schema-invalid record before calling Core) but never converts a Core decision into a different decision.
4. Core's decision format, policy digest and evidence format are consumed as versioned contracts (`api/POLICY-SCHEMA.md`, `api/EVIDENCE-SCHEMA.md`).

## Consequences

- Core's API or SDK must be stable before Phase 4 (DEP-01, OD-03).
- A Core outage produces fail-closed results (ADR-0002).
- Cross-repository change coordination is required when Core's contract changes.

## Alternatives considered

- Implement a local policy evaluator in the App: rejected, creates a second authority and duplicates audit scope.
- Embed Core as a library only: accepted as one of the two integration modes in OD-03, not a separate architecture.

## Tests or documents affected

`architecture/SYSTEM-ARCHITECTURE.md`, `api/POLICY-SCHEMA.md`, `api/EVIDENCE-SCHEMA.md`, tests AUTH-*, CRY-*.
