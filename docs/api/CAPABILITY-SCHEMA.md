# Capability Schema v1.0

Document version: 1.0
Status: Draft for Phase 0 freeze. Machine-readable JSON Schema is stored at `docs/api/schemas/capability-record.v1.json` once frozen.

## 1. Purpose

Canonical representation of capabilities declared by an agent configuration, after normalization. The schema is the basis for drift comparison, policy evaluation and evidence.

## 2. Record

```json
{
  "schema_version": "1.0",
  "agent_id": "agent-claude-code",
  "repository": "payments-service",
  "capabilities": [
    {
      "type": "filesystem",
      "scope": "repository",
      "permission": "write",
      "provenance": "declared",
      "source": { "path": ".claude/settings.json", "commit_sha": "abc123", "pointer": "/permissions/allow/0" },
      "normalizer_version": "1.0.0"
    },
    {
      "type": "shell",
      "scope": "restricted",
      "permission": "execute",
      "provenance": "declared",
      "source": { "path": ".claude/settings.json", "commit_sha": "abc123", "pointer": "/permissions/allow/1" },
      "normalizer_version": "1.0.0"
    }
  ],
  "parser_version": "claude-code@1.0.0",
  "content_digest": "sha256:..."
}
```

The example in the product specification omits `provenance`, `source.pointer` and version fields. Those are required in v1.0 and are added here.

## 3. Field definitions

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| `schema_version` | string | yes | Exactly `"1.0"` for this version |
| `agent_id` | string | yes | Deterministic slug derived from source (see DATA-MODEL) |
| `repository` | string | yes | Immutable repository ID as string in storage; name shown for display |
| `capabilities` | array | yes | May be empty; order is canonical (see §5) |
| `capabilities[].type` | enum | yes | `filesystem`, `shell`, `network`, `tool_execution`, `mcp_server`, `secret_access`, `repository_write`, `workflow_modification`, `deployment`, `external_service`, `unknown` |
| `capabilities[].scope` | enum | yes | `repository`, `restricted`, `unrestricted`, `unknown` |
| `capabilities[].permission` | enum | yes | `read`, `write`, `execute`, `none`, `unknown` |
| `capabilities[].provenance` | enum | yes | `declared`, `inferred`, `unknown` |
| `capabilities[].source` | object | yes | `path`, `commit_sha` and `pointer` (RFC 6901 JSON pointer, or line range for text formats) |
| `capabilities[].normalizer_version` | string | yes | Semantic version |
| `parser_version` | string | yes | Parser identifier and version |
| `content_digest` | string | yes | SHA-256 of the canonical source bytes |

## 4. Normalization rules

1. **Unknown is never safe.** Any permission string not in the mapping table becomes `type: unknown` (or `permission: unknown`) with `provenance: unknown`. It is never mapped to `none` or `read`.
2. **Equivalent configurations** produce identical records. Equivalence is defined by the mapping table, not by byte equality of source files (AC-04.1).
3. **Declared versus inferred.** Inferred capabilities (derived from other fields) are marked `inferred` and must cite the fields used. In v1.0 no inference is performed; the flag is reserved.
4. **Restrictions** are capabilities too: a network restriction removed is a capability change (`scope` broadened), see FR-06.
5. **Secret values** are never stored. A secret reference records the name and the source pointer only, with `type: secret_access`.

## 5. Canonical serialization

- JSON with keys sorted lexicographically, no insignificant whitespace, UTF-8, LF line endings.
- `capabilities` sorted by the tuple `(type, scope, permission, source.path, source.pointer)`.
- Digest computed over canonical bytes. Digest algorithm: SHA-256.
- Identical input bytes and identical `parser_version` must produce identical canonical output (AC-04.5, NORM-04).

## 6. Validation

Invalid records are rejected before reaching the baseline or the policy adapter (AC-04.4). A record is invalid if:

- Any required field is missing.
- An enum value is outside its list.
- `capabilities` contains duplicate `(type, scope, permission, source)` tuples.
- `schema_version` is unsupported.

## 7. Versioning

- Adding an enum value is a minor version change only if consumers are required to treat unknown values as `unknown`. v1.0 consumers must do so.
- Removing or renaming a field is a major change.
- Records keep the `schema_version` they were produced under. Historical records are not rewritten (AC-05.4).
