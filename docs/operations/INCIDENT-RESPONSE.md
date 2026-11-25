# Incident Response

Document version: 1.0
Status: Proposed. Contact list, paging tool and escalation names are TBD before launch.

## 1. Severity

| Severity | Definition | Examples | Initial response |
| --- | --- | --- | --- |
| SEV-1 | Confirmed or suspected cross-tenant data exposure; evidence forgery or integrity failure; enforcement reporting success incorrectly; complete outage of enforcement | Tenant A sees B's evidence; ledger gap; check `success` without evidence | 15 minutes; incident commander assigned |
| SEV-2 | Partial outage; degraded evaluation; sustained Core errors; KMS signing errors for some tenants | Evaluation backlog above SLO | 30 minutes |
| SEV-3 | Limited impact; single installation issues; non-critical bug | One tenant rate-limited | Next business day |

Any SEV-1 candidate is treated as SEV-1 until classification is confirmed.

## 2. Roles

| Role | Responsibility |
| --- | --- |
| Incident commander | Owns the response, decides severity changes, approves communications |
| Technical lead | Diagnosis and remediation |
| Security lead | Assesses data exposure; leads evidence preservation |
| Communications | Customer and status updates |
| Scribe | Timeline in the incident record |

Single-person deployments assign all roles to the owner and record that fact.

## 3. Response steps

1. **Detect and declare.** Alert, customer report or internal observation. Open the incident record with start time.
2. **Triage.** Assign severity. For suspected cross-tenant exposure, immediately restrict the affected surface (disable the endpoint or export path) before further diagnosis.
3. **Preserve evidence.** Snapshot logs, audit events and ledger state. Do not modify evidence records; the ledger is append-only.
4. **Contain.** Examples: suspend affected tenant (TENANT-ISOLATION §9), disable a worker pool, revoke a key grant, roll back a release (DEPLOYMENT §5).
5. **Eradicate and recover.** Fix, verify with regression tests, restore service with the verification steps in DEPLOYMENT §8.
6. **Notify.** Affected customers within the contractual window (TBD). Notifications contain no tenant data of other customers.
7. **Post-incident review.** Within 5 working days. Blameless. Produces actions with owners.

## 4. Specific playbooks

### 4.1 Suspected cross-tenant access (SEV-1)

1. Identify the requesting tenant, the object and the path (API, dashboard, export, queue).
2. Determine whether the access succeeded. Query audit events and access logs.
3. If successful, the security lead defines the exposed data set and notifies the affected tenant under legal guidance.
4. Add a regression test in `tests/isolation` before the fix is merged.

### 4.2 Evidence integrity failure (SEV-1)

1. Stop new evidence writes for the affected tenant if the chain cannot be extended safely.
2. Run the verifier over the affected range. Record the first failing sequence.
3. Determine whether the failure is a storage fault, a bug, or tampering. Tampering is escalated to the security lead and treated as a potential forgery.
4. Do not rewrite records. Corrections are new records that reference the affected evidence (EVIDENCE-SCHEMA §8).
5. Notify affected tenants with the verification result.

### 4.3 Signing key compromise (SEV-1)

1. Revoke the tenant key for signing with KMS (disable the key version).
2. Create a new key version and begin signing with it.
3. Mark the compromised key as `revoked` in the public key set with the revocation time. Records signed by the key after the compromise time are untrusted; those before remain verifiable if the compromise time is established.
4. Re-verify all evidence signed in the window and report results to affected tenants.
5. Record the procedure outcome in the results log.

### 4.4 Check reporting success incorrectly (SEV-1)

1. Identify affected PRs by querying Check Runs with `success` whose evidence is missing or whose decision is not `allow`.
2. Re-evaluate those commits. Update Check Runs to the correct conclusion where the PR is still open.
3. Notify affected customers. Record the list of commits affected.
4. Add a regression test in E2E or AUTH suites.

### 4.5 Core unavailable (SEV-2)

1. Confirm enforcement is fail-closed (no `success` published). Check Run states should show `failure` or `in_progress` per ADR-0002.
2. Monitor evaluation backlog. Do not drop events.
3. Notify customers if PR merges are being blocked for more than the defined window (TBD).

### 4.6 GitHub API outage (SEV-2)

1. Confirm retries are scheduled with backoff.
2. Pause reconciliation to avoid rate-limit compounding.
3. Resume on recovery and reconcile.

## 5. Communication

- Status page for customers (TBD tooling).
- Internal channel for incidents with incident record link.
- External statements require approval by the incident commander and, for SEV-1, legal counsel.

## 6. Evidence and records

Every incident record contains: timeline, severity history, impact assessment (tenants affected, data classes), actions, communications sent, post-incident review link, and the results-log entry if a test or verification was run.

## 7. Drills

A tabletop exercise for §4.1 and §4.3 is run before launch and at least twice per year.
