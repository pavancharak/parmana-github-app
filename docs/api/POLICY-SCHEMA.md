# Policy Schema v1.0

Document version: 1.0
Status: Draft. Final evaluation semantics must match Parmana Core's policy contract (ADR-0001, OD-03).

## 1. Example

```json
{
  "schema_version": "1.0",
  "policy_id": "agent-permission-policy",
  "version": "1.0.0",
  "rules": [
    { "id": "r-001", "capability": "filesystem", "scope": "repository", "permission": "write", "decision": "allow" },
    { "id": "r-002", "capability": "shell", "scope": "restricted", "permission": "execute", "decision": "allow" },
    { "id": "r-003", "capability": "production_access", "decision": "deny" }
  ],
  "default_decision": "deny"
}
```

The product specification uses `capability: production_access`. That name is not in the capability enum of CAPABILITY-SCHEMA. Rules that reference a capability type must use the enum in CAPABILITY-SCHEMA. Production access is represented as `secret_access` or `external_service` with a `target` attribute. This mapping is recorded as OD-13 and must be confirmed before Phase 3.

## 2. Fields

| Field | Required | Rule |
| --- | --- | --- |
| `schema_version` | yes | `"1.0"` |
| `policy_id` | yes | Stable identifier within tenant |
| `version` | yes | Semantic version of the policy document |
| `rules` | yes | Ordered list; may be empty (then default applies) |
| `rules[].id` | yes | Unique within policy; never reused |
| `rules[].capability` | yes | Capability type enum |
| `rules[].scope`, `rules[].permission` | no | If omitted, the rule matches any value |
| `rules[].decision` | yes | `allow`, `deny`, `approval_required` |
| `rules[].approval` | conditional | Required when `decision` is `approval_required`; specifies approver group and approvals needed (1 or 2) |
| `default_decision` | yes | Must be `deny` in v1.0. Any other value is a validation error |

## 3. Evaluation semantics

1. **Per capability.** Each capability in the normalized diff is evaluated separately. A diff item is an *expansion* if the new state grants more than the baseline state (AC-06.3, AUTH-011, AUTH-012).
2. **Matching.** A rule matches when all specified fields equal the capability's fields.
3. **Precedence.**
   1. Absolute deny rules (`decision: deny` with `absolute: true`) always win. Approval cannot override them (AC-09.7).
   2. Otherwise, the most specific matching rule wins: a rule with more specified fields beats one with fewer.
   3. Among equally specific rules, a `deny` beats `approval_required`, which beats `allow`.
   4. If still tied, the lowest rule `id` in lexicographic order applies (deterministic, documented).
4. **No match.** Apply `default_decision` (`deny`) (AUTH-004).
5. **Unknown provenance.** A capability with `provenance: unknown` or `type: unknown` is never matched by an `allow` rule. It is evaluated as `deny` unless an explicit rule for `unknown` exists (AC-04.2, UT-012).
6. **Diff decision.** The overall PR decision is the most restrictive result across all diff items: `deny` > `approval_required` > `allow`. An empty diff yields `allow` with an informational result (FR-08 table).
7. **Failure.** Missing, unparseable or schema-invalid policy yields `failure`, which enforces as a failing check (ADR-0002, UT-013, UT-014).

## 4. Versioning and immutability

- Published policy versions are immutable (AC-07.6, DATA-MODEL).
- A rollback creates a new version whose content equals an earlier version (AUTH-010).
- Each decision records `policy_version_id` and `policy_digest` (AC-07.5).
- Digest is SHA-256 of canonical JSON (same rules as CAPABILITY-SCHEMA §5).

## 5. Authoring safeguards

- Policies are validated against this schema on save and on publish.
- Publishing requires a second authorized person where OD-08 requires it.
- A policy change that loosens a rule (allow added, deny removed, approval replaced by allow) is flagged for review in the dashboard.
- Policy evaluation never executes policy content. Policies are data only.
