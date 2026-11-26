# ADR-0008: Approval identity and signing key custody

Status: Accepted (2026-11-26, owner decision recorded in OPEN-DECISIONS OD-04 and OD-05)
Date: 2026-11-26
Decision owner: Pavan Charak

## Context

Two security properties depend on who can act and which key signs. OD-04 asks how approvers prove who they are. OD-05 asks where tenant signing keys live. Both decide what an attacker with a stolen session or a compromised App process could do.

## Decision

1. **Approvers sign in with GitHub OAuth.** Parmana does not run its own passwords or identity store.
2. **Every approval needs step-up.** Before an approval is recorded, the approver re-authenticates with GitHub within the last 5 minutes. A session that has not re-authenticated cannot approve, even if it is signed in.
3. **Approvals bind to exact state.** Each approval records the PR, commit SHA, capability diff, policy version and approver, and expires. Approval for one commit cannot be replayed for another (FR-09).
4. **Signed approvals come later.** A signature from a key the approver controls, verified by Core, is planned after Release 1.0. It is not needed for the pilot, which records approvals as unsigned (ADR-0006).
5. **Signing keys live in AWS KMS, one customer-managed key per tenant.** Only Core holds permission to sign (ADR-0001 and OD-03). The App process has no signing permission and never sees key material.
6. **Key use is logged.** Every KMS sign call is recorded in CloudTrail and linked to the evidence record it signed. Key rotation is recorded in the evidence ledger (FR-10 item 8).
7. **Compromise response.** If a tenant key is suspected compromised, the key is disabled, signing for that tenant stops and fails closed (ADR-0002), and evidence signed before the incident is re-verified.

## Consequences

- Core needs a KMS key policy per tenant, which must be tested (CRY-series tests).
- Pilot approvals are unsigned, so the pilot cannot prove approver identity to a third party. Customers must be told this in writing.
- Step-up adds one re-authentication for each approval. This is accepted to prevent approval by an unattended session.

## Alternatives considered

- **GitHub OAuth only, no step-up.** Rejected: an unattended browser session could approve.
- **Parmana-run passwords or SSO.** Rejected: a second identity store to secure, for no gain over GitHub.
- **One shared signing key for all tenants.** Rejected: one leaked key would sign for every customer, breaking FR-02.
- **Keys held by the App process.** Rejected: it would give the internet-facing service signing power (ADR-0001).

## Tests or documents affected

- `docs/product/OPEN-DECISIONS.md` OD-04, OD-05.
- `docs/security/CRYPTOGRAPHIC-EVIDENCE.md`: key custody and rotation match this ADR.
- `docs/product/FUNCTIONAL-REQUIREMENTS.md` FR-09: step-up is a stated requirement.
- Tests to add: AUTH-series step-up refusal, approval replay refusal, and KMS key-policy isolation between tenants.
