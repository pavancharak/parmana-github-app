# Functional Requirements

Document version: 1.0
Source: Product specification §4. Each requirement has a stable ID. Acceptance criteria are in `ACCEPTANCE-CRITERIA.md`. Test mapping is in `testing/TEST-CASES.md`.

Priority keys: **M** = must ship in Release 1.0. **D** = deferred.

---

## FR-01: GitHub App installation and organization onboarding (M)

**Purpose:** Allow organizations to install Parmana without manually configuring credentials.

1. Support GitHub App installation on organizations.
2. Capture immutable GitHub installation ID and organization ID.
3. Create a tenant workspace on successful installation.
4. Support all-repository and selected-repository installation modes.
5. Verify installation ownership before processing requests.
6. Support installation suspension and removal.
7. Reconcile repository permissions after installation changes.
8. Maintain installation lifecycle history.

## FR-02: Multi-tenant isolation (M)

**Purpose:** Ensure each customer organization has independent control over its data.

- Unique tenant identifier.
- Tenant-scoped database records.
- Tenant-scoped queues and event processing.
- Tenant-specific policies and baselines.
- Tenant-specific evidence.
- Organization-specific user roles.
- Separate signing identities or keys per tenant.
- Tenant-specific retention settings.
- Explicit tenant context in all application service operations.

Critical invariant: *a valid GitHub installation must never grant access to another organization's policies, evidence, repositories or credentials.* Detailed design: `architecture/TENANT-ISOLATION.md`.

## FR-03: Repository discovery (M)

**Purpose:** Identify repositories that contain AI agent configurations.

| Configuration | Discovery target |
| --- | --- |
| Claude Code | `.claude/` |
| Agent instructions | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` and supported configuration files |
| MCP | Supported MCP configuration files |
| GitHub Actions | `.github/workflows/` |
| Custom agents | Documented Parmana-supported manifests |

1. Scan selected repositories.
2. Identify supported agent configuration files.
3. Record file path, content digest and commit SHA.
4. Identify parser version.
5. Support initial scans and incremental PR scans.
6. Detect deleted and renamed configurations.
7. Maintain repository scan history.
8. Handle malformed configuration files safely.
9. Avoid logging secret values.
10. Report unsupported configuration formats without pretending they were analyzed.

The exact supported-format list is an open decision (OD-01). Until it is frozen, discovery scope is limited to the targets above.

## FR-04: Capability normalization (M)

**Purpose:** Convert different agent configuration formats into one canonical capability model.

Capability categories: filesystem access; shell execution; network access; tool execution; MCP server access; secret access declarations; repository write access; workflow modification; deployment permissions; external service access.

1. Use a versioned canonical schema (`api/CAPABILITY-SCHEMA.md`).
2. Preserve source references.
3. Normalize equivalent permissions consistently.
4. Distinguish **declared**, **inferred** and **unknown** capabilities.
5. Never interpret an unknown capability as safe.
6. Reject invalid schema structures.
7. Maintain parser and normalization versions.
8. Produce deterministic output for identical input.

## FR-05: Capability baseline management (M)

**Purpose:** Establish the organization's approved capability reference.

1. Generate an initial capability inventory.
2. Allow authorized administrators to review it.
3. Support baseline approval.
4. Version every approved baseline.
5. Preserve previous baseline versions.
6. Support rollback to an earlier version.
7. Record approver identity and approval time.
8. Require appropriate approval for baseline changes.

## FR-06: Permission drift detection (M)

**Purpose:** Identify changes in declared agent capabilities.

| Drift type | Example | Default severity |
| --- | --- | --- |
| New capability | Shell access introduced | High |
| Scope expansion | Repository to unrestricted filesystem | Critical |
| Permission expansion | Read to write | High |
| New external access | New MCP server | High |
| Credential declaration | Production secret reference | Critical |
| Restriction removal | Network restriction removed | Critical |
| Configuration deletion | Agent configuration removed | Informational |
| Unknown capability | Unsupported tool introduced | High |

1. Compare proposed configuration against approved baseline.
2. Detect additions, removals and scope changes.
3. Detect privilege escalation.
4. Generate stable drift identifiers.
5. Support severity and policy overrides.
6. Distinguish legitimate removals from unauthorized expansion.
7. Preserve complete comparison results.
8. Avoid nondeterministic risk calculations.

## FR-07: Deterministic policy engine (M)

**Purpose:** Evaluate declared capability changes against organization-approved authority.

1. Evaluate every proposed capability against approved policies.
2. Support `allow`, `deny` and `approval_required` decisions.
3. Apply explicit precedence rules (`api/POLICY-SCHEMA.md`).
4. Default to deny when no valid rule matches.
5. Fail closed on policy parsing or evaluation errors.
6. Record policy version and digest.
7. Produce deterministic decisions.
8. Prevent unapproved policy changes.
9. Integrate with Parmana Core rather than creating a competing authorization engine.

## FR-08: Pull request enforcement (M)

**Purpose:** Make authorization decisions visible and enforceable in GitHub.

Required GitHub events: pull request opened, synchronized, reopened, closed; installation permissions changed.

Workflow: receive webhook → verify signature → validate installation and repository access → retrieve changed files → identify agent configuration changes → normalize capabilities → compare with baseline → evaluate policy → publish Check Run → append evidence.

| Decision | GitHub check |
| --- | --- |
| All changes authorized | Success |
| Approval required | Action required / pending |
| Unauthorized capability | Failure |
| Evaluation unavailable | Failure |
| No relevant configuration changes | Success with informational result |

Parmana publishes the result. The organization must configure branch protection or repository rulesets to require the check.

## FR-09: Human approval workflow (M)

**Purpose:** Allow organizations to approve exceptional capability changes without weakening their policies.

1. Define authorized approver groups.
2. Support single-person and two-person approvals.
3. Bind approval to exact PR, commit, capability changes and policy version.
4. Set approval expiration.
5. Prevent replay of approval tokens.
6. Invalidate approval when the relevant PR changes.
7. Record approval and rejection reasons.
8. Require step-up authentication or signed approval where supported by Parmana Core.
9. Support approval delegation only through explicit policy.

## FR-10: Evidence ledger (M)

**Purpose:** Create independently verifiable records of the complete authorization process.

Each record carries the fields in `api/EVIDENCE-SCHEMA.md`: evidence ID, tenant ID, installation ID, repository ID, PR number, commit SHA, agent ID, capability diff, baseline version, policy version, decision, approver, parser version, trusted timestamp, previous hash, signature.

1. Integrate with Parmana's existing evidence and signing capabilities.
2. Use canonical serialization.
3. Sign records with tenant-specific keys.
4. Maintain append-only evidence.
5. Support offline verification.
6. Detect modified, missing or reordered records.
7. Provide export in a documented format.
8. Maintain key rotation and verification history.

## FR-11: Organization dashboard (M)

Sections: Overview; agent inventory; repository inventory; capability baseline; permission drift; policy management; pull request decisions; human approvals; evidence explorer; audit history; organization settings.

Users see only their organization's data. Dashboard counts reconcile with underlying records. Filters work across repository, agent, date and decision. Users can open the originating GitHub PR. Evidence details show verification status. Unauthorized users cannot reach administrative functions. Empty, loading and error states are implemented. Sensitive configuration values are never displayed.

## FR-12: Notifications (M)

1. Notify administrators of critical drift.
2. Notify approvers of pending requests.
3. Notify developers of failed PR checks.
4. Notify owners when GitHub installation permissions change.
5. Support configurable notification preferences.
6. Avoid duplicate notifications.
7. Include links to the relevant PR or evidence record.

## FR-13: Audit and administration (M)

1. Searchable administrative event history.
2. User and role change history.
3. Policy publication history.
4. Baseline publication history.
5. Installation lifecycle events.
6. Evidence export history.
7. Data retention controls.
8. Tenant suspension and deletion workflows.

## FR-14: Dry-run mode (accepted 2026-11-26, pilot)

**Purpose:** let a team see what Parmana would block before Parmana can block anything.

1. A repository can be set to dry-run. Evaluations run, and results are recorded and shown in the check output.
2. In dry-run, the published check never has a failure conclusion. It reports `neutral` with the would-be result in its summary.
3. Dry-run is set per repository and recorded in the audit history when changed.
4. Switching a repository from dry-run to enforced requires an owner action and an audit entry.

Acceptance: a pull request that would fail in enforced mode shows `neutral` in dry-run, and its summary names the change that would have failed.
