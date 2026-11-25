# End-to-End Scenarios

Document version: 1.0
These are the customer journeys that define product acceptance. They run against a staging environment with a dedicated test GitHub organization, a test installation and a Parmana Core build pinned to a specific version.

Each scenario lists setup, steps, and pass criteria. Results are recorded per release in the results log, with the commit SHA and runtime.

---

## E2E-001: Normal installation and onboarding

**Setup:** Test organization `parmana-e2e-a` with three repositories. Test agent configurations in two of them.

**Steps**
1. Create a test GitHub organization.
2. Install Parmana.
3. Select two repositories.
4. Complete initial discovery.
5. Review capabilities.
6. Approve baseline.

**Pass criteria:** Both repositories appear in the correct tenant. The baseline is versioned and approved. The third repository does not appear. No capability was approved automatically (AC-05.1).

**Covers:** US-01, US-02, US-09, FR-01, FR-03, FR-05.

---

## E2E-002: Unauthorized shell expansion

**Setup:** Repository with a repository-only agent configuration. Branch protection requiring the Parmana check on `main`.

**Steps**
1. Start with a repository-only agent configuration.
2. Open a PR adding unrestricted shell access.
3. Trigger Parmana evaluation.
4. Attempt to merge.

**Pass criteria:** Parmana detects the expansion, denies it and publishes a failing required check with `head_sha` equal to the PR head. The merge is blocked by branch protection. An evidence record with decision `deny` exists and verifies.

**Covers:** US-11, US-17, FR-06, FR-07, FR-08, FR-10.

---

## E2E-003: Valid approval

**Setup:** A policy that makes a specific change `approval_required`.

**Steps**
1. Introduce a permission change requiring approval.
2. Open the PR.
3. Submit approval from an authorized administrator.
4. Re-evaluate the same commit.
5. Inspect evidence.

**Pass criteria:** The exact change is approved, the check succeeds and the approval is cryptographically linked to the decision (approval reference in evidence, approval record signed).

**Covers:** US-13, US-16, FR-09, FR-10.

---

## E2E-004: Approval invalidation

**Steps**
1. Obtain approval for commit A.
2. Push commit B with an additional permission expansion.
3. Re-evaluate.

**Pass criteria:** Approval for commit A cannot authorize commit B. The check for B is not `success`. The approval for A remains in the audit history as applying to A only.

**Covers:** US-15, AC-09.3, AC-08.7.

---

## E2E-005: Cross-tenant attack

**Setup:** Installations for organization A and organization B, with different policies and evidence.

**Steps**
1. Install Parmana for organizations A and B.
2. Create different policies and evidence.
3. Attempt to access B's resources through A's authenticated session.
4. Attempt the same through API, dashboard, queue and export paths.

**Pass criteria:** All unauthorized operations are denied. Security events are recorded in the audit history of the tenant that made the attempt. No data from B appears in any response, export, log line visible to A, or notification to A.

**Covers:** US-24, FR-02, NFR-07. Release blocking.

---

## E2E-006: Service outage

**Steps**
1. Disconnect the policy engine.
2. Open a PR containing a sensitive change.
3. Observe the check.
4. Restore the service.
5. Retry processing.

**Pass criteria:** No authorization bypass occurs (the check is never `success` while Core is unavailable). No webhook event is lost (every delivery has a `webhook_events` row). Processing recovers after restore. Exactly one evidence record exists for the final decision and no duplicates (AC-08.5).

**Covers:** US-25, ADR-0002, NFR-05.

---

## E2E-007: Offline proof verification

**Steps**
1. Generate evidence for an authorized change.
2. Export the evidence and public verification material.
3. Disconnect from Parmana.
4. Verify the evidence locally.

**Pass criteria:** Verification succeeds without contacting the original service. The verifier is run with network disabled. Modifying one byte of a record causes failure.

**Covers:** US-22, US-23, AC-10.4, CRY-011.

---

## Additional scenarios (Added)

### E2E-008: Configuration file renamed in a PR

Rename `.claude/settings.json` to `.claude/config.json` with no content change. **Pass:** Drift is not reported as expansion. Renamed path is reconciled to the same agent (DRIFT-06, GH-012).

### E2E-009: Installation suspended mid-evaluation

Suspend the installation while a job is queued. **Pass:** The job does not call GitHub after suspension. The evaluation ends `failure` with reason `installation_suspended`, or is held, and no `success` is published (GH-004).

### E2E-010: Two organizations, same repository name

Two installations contain repositories named `payments-service`. **Pass:** Records are keyed by immutable repository ID. Dashboards show separate inventories (TEN-001, TEN-002).

### E2E-011: Policy rollback

Publish policy v2, roll back to v1. **Pass:** Rollback creates v3 with v1 content. Evaluations before the rollback keep their original policy references (AUTH-010, BASE-05).

### E2E-012: Malformed configuration in PR

PR adds `.claude/settings.json` with invalid JSON. **Pass:** Evaluation reports `parse_error` for that path. Other valid files are still evaluated. Check is `failure` with the reason (UT-004, ADR-0002).

---

## Scenario-to-requirement coverage

| Scenario | Requirements | Stories |
| --- | --- | --- |
| E2E-001 | FR-01, FR-03, FR-05 | US-01, US-02, US-09 |
| E2E-002 | FR-06, FR-07, FR-08 | US-11, US-17 |
| E2E-003 | FR-09, FR-10 | US-13, US-16 |
| E2E-004 | FR-09 | US-15 |
| E2E-005 | FR-02 | US-24 |
| E2E-006 | FR-08, NFR-05 | US-25 |
| E2E-007 | FR-10 | US-22, US-23 |
| E2E-008 to E2E-012 | FR-03, FR-05, FR-07, FR-08 | US-12, US-18 |
