# Cryptographic Evidence

Document version: 1.0
Status: Design. Primitives and packaging are provided by Parmana Core. This document specifies what the App requires from them.

## 1. Requirements

1. Every completed policy decision produces a signed record.
2. Records are chained per tenant so that deletion, reordering and modification are detectable.
3. Each tenant uses its own signing key. Keys rotate without invalidating historical verification.
4. Verification is possible offline with exported public material.
5. Signing failure never results in a successful enforcement claim (ADR-0002).

## 2. Algorithms (proposed; confirm with Core)

| Purpose | Algorithm | Notes |
| --- | --- | --- |
| Record hash | SHA-256 | Over canonical bytes |
| Signature | ECDSA P-256 with SHA-256 (or Ed25519 if Core supports it) | KMS-backed |
| Canonical serialization | RFC 8785 JSON Canonicalization Scheme (JCS) | Recommended; confirm matches Core |

## 3. Key hierarchy

```
AWS KMS (per environment, per tenant CMK alias)
    └─ signing key version (tenant-key-vN)
          ├─ used only by Core signing service, via tenant context
          └─ public key exported to evidence key set (keys.json)
```

- Private keys never leave KMS. Parmana services call `Sign` with a key alias.
- Each key version has `key_id`, `created_at`, `not_before`, `not_after` (if rotated), and `status`.
- Retired keys remain in the public key set for verification (CRY-009).

## 4. Rotation

1. Create a new key version for the tenant.
2. Publish the new public key to the key set with `not_before` set to the rotation time.
3. Switch signing to the new key version for new records.
4. Retire the old key for signing (not for verification).
5. Record rotation as an audit event.

Rotation for tenant A never touches tenant B (TEN-009).

## 5. Chain construction

- Genesis: for each tenant, the first record has `previous_hash` equal to `sha256:` of the string `parmana-evidence-genesis:<tenant_id>`.
- `record_hash = SHA-256(canonical(record without record_hash and signature))`.
- `signature = Sign(key, record_hash)`.
- Sequence assignment is transactional with the decision write (`evidence_records` unique on `(tenant_id, sequence)`).

## 6. Persistence and enforcement coupling

The evaluation transaction order:

1. Compute decision.
2. Build evidence record; obtain `sequence` and `previous_hash` in a transaction.
3. Sign.
4. Commit the decision and evidence together.
5. Only after commit, publish the Check Run with the decision.

If step 3 or 4 fails, no decision is committed and no success is published (AC-10.6, CRY-012).

## 7. Verification

Procedure in `api/EVIDENCE-SCHEMA.md` §5. The product must provide:

- A downloadable verifier (open-source CLI, consistent with Core) that runs without network access.
- A UI verification status that reflects the same procedure (DASH-04).

## 8. Trust roots

- The **trust root** for a bundle is the public key set exported with it, plus the signed statement of which keys belong to the tenant. The bundle's key set must be pinned by the verifier using a key fingerprint supplied out-of-band by the customer. Without pinning, a verifier can only prove internal consistency (CRY-010).
- Pinning mechanism to be finalized with Core (OD-05 related).

## 9. Test coverage

Test IDs CRY-001 to CRY-012 in `testing/TEST-CASES.md`. Key compromise and KMS outage tests are in `testing/SECURITY-TEST-PLAN.md`.

## 10. Known limits

- Evidence proves that the App or Core recorded a decision over specified inputs. It does not prove the inputs reflect runtime behavior (SECURITY-BOUNDARIES §2).
- A compromised signing key allows forgery until rotation and revocation. Revocation procedure is in `operations/INCIDENT-RESPONSE.md`.
