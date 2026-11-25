# Evidence Schema v1.0

Document version: 1.0
Status: Draft. Signature format and key identifiers must align with Parmana Core evidence packages (ADR-0001).

## 1. Purpose

Each completed policy decision produces one evidence record. Records are signed, hash-linked per tenant and verifiable offline with exported public keys.

## 2. Record

```json
{
  "schema_version": "1.0",
  "evidence_id": "ev_...",
  "tenant_id": "uuid",
  "installation_id": 12345678,
  "repository_id": 987654321,
  "pr_number": 42,
  "commit_sha": "40-hex",
  "agent_id": "agent-claude-code",
  "capability_diff_digest": "sha256:...",
  "capability_diff": [],
  "baseline_version_id": "uuid",
  "baseline_digest": "sha256:...",
  "policy_version_id": "uuid",
  "policy_digest": "sha256:...",
  "decision": "allow | deny | approval_required | failure",
  "approval_refs": [],
  "parser_version": "claude-code@1.0.0",
  "normalizer_version": "1.0.0",
  "evaluated_at": "2026-01-01T00:00:00Z",
  "sequence": 1042,
  "previous_hash": "sha256:...",
  "record_hash": "sha256:...",
  "signature": { "alg": "ECDSA_P256_SHA256", "key_id": "tenant-key-v3", "value": "base64..." }
}
```

## 3. Field definitions

| Field | Required | Rule |
| --- | --- | --- |
| `evidence_id` | yes | Unique, opaque, generated server-side |
| `tenant_id` | yes | Must equal the tenant of the containing ledger |
| `installation_id`, `repository_id` | yes | Immutable GitHub identifiers |
| `commit_sha` | yes | Evaluated head commit (CRY-005) |
| `capability_diff` / `capability_diff_digest` | yes | Full diff is stored; digest allows verification even if the diff is redacted in an export |
| `baseline_*`, `policy_*` | yes | Version identifiers and digests (CRY-004) |
| `decision` | yes | Enum; `failure` records are written only when persistence of the failure itself is possible, and never count as enforcement success |
| `evaluated_at` | yes | Trusted server time at evaluation, RFC 3339 UTC |
| `sequence` | yes | Strictly increasing per tenant, no gaps in a complete ledger (CRY-007) |
| `previous_hash` | yes | `record_hash` of sequence − 1; genesis value defined per tenant (CRY-008) |
| `record_hash` | yes | SHA-256 over canonical serialization of all fields except `record_hash` and `signature` |
| `signature` | yes | Over `record_hash` with tenant key `key_id` |

## 4. Canonical serialization

Same rules as CAPABILITY-SCHEMA §5 (sorted keys, UTF-8, no insignificant whitespace), applied to the record without `record_hash` and `signature`. The byte string is hashed, then the hash is signed.

## 5. Verification procedure (offline)

Given an exported bundle containing records, the public verification keys with `key_id` and validity periods, and the genesis value:

1. Recompute canonical bytes for each record and check `record_hash`. Fail on mismatch (CRY-003 to CRY-006).
2. Verify `signature` with the public key identified by `key_id`, valid at `evaluated_at`. Fail if the key is unknown or not valid at that time (CRY-010).
3. Check `sequence` values are contiguous and `previous_hash` links correctly. Fail on gap, reorder or missing record (CRY-007, CRY-008).
4. Check `tenant_id` is consistent across all records in the bundle (CRY-006).
5. Report verification per record and for the bundle.

Verification requires no network access and no contact with the original service (E2E-007, CRY-011).

## 6. Key rotation

- Rotation adds a new `key_id`. Old keys remain in the public key set with their validity intervals (CRY-009).
- Verification uses the key valid at `evaluated_at`, not the current key.
- Key material and rotation history are themselves audit events.

## 7. Export format

Bundle: a `.zip` containing `records.jsonl` (one canonical record per line, ordered by `sequence`), `keys.json` (public keys), `manifest.json` (tenant, sequence range, count, bundle digest, export time, schema version) and `VERIFY.md` (offline procedure). Format is documented here and versioned with this schema. Export is streamed; memory use is bounded (PERF-008).

## 8. Failure semantics

- If an evidence record cannot be persisted, the evaluation is not final and the Check Run is not `success` (AC-10.6, CRY-012).
- A record is never updated. Corrections are new records that reference the previous `evidence_id` in an `amends` field (reserved in v1.0, required in v1.1).
