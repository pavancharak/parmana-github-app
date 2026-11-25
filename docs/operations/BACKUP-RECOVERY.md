# Backup and Recovery

Document version: 1.0
Status: Requirements. RPO and RTO values are **TBD** (OD-07). The values below are placeholders that must be replaced by owner decision before production release. They are not commitments.

## 1. Scope of data

| Data | Recovery priority | Notes |
| --- | --- | --- |
| Evidence ledger (`evidence_records`, `evidence_keys`) | Highest | Integrity proof; must restore with contiguous sequence |
| Audit events | Highest | Append-only |
| Policies and baseline versions | High | Immutable versions |
| Installations, repositories, tenants | High | Rebuildable from GitHub, but tenant identity must be preserved |
| Drift findings, evaluations, scans | Medium | Rebuildable by re-evaluation at the same commit, except historical decision state |
| Queue | Medium | Restored or drained; see §4 |
| Cache | None | Rebuildable |
| KMS keys | Highest | Managed by KMS; protected by KMS backup and key policy, not by application backups |

## 2. Placeholder objectives (to be decided)

| Objective | Placeholder | Decided by |
| --- | --- | --- |
| RPO (maximum data loss) for database | 5 minutes (PITR) | OD-07 |
| RTO (time to restore service) | 4 hours | OD-07 |
| RPO for evidence ledger | 0 committed records lost; decisions not committed are never reported successful | OD-07 |
| RTO for webhook acceptance | 1 hour | OD-07 |

Because the ledger rule is "no success without persisted evidence", the effective RPO for enforcement is zero: any decision whose evidence was lost would have been reported as not successful. Re-evaluation then restores enforcement state.

## 3. Backup requirements

- Managed PostgreSQL automated backups with point-in-time recovery enabled.
- Backups encrypted at rest with customer-independent keys managed in KMS.
- Cross-zone copies. Cross-region copies are required before enterprise production (TBD).
- Backup retention is defined in OD-06 and must not conflict with deletion commitments in `architecture/TENANT-ISOLATION.md` §9.
- Backups are access-controlled and their access is audited (OPS-ACC-01).

## 4. Queue recovery

- Jobs are durable. On restore, unacknowledged jobs are re-enqueued from `webhook_events` where status is not terminal.
- Idempotency keys prevent duplicate evaluations and duplicate evidence (AC-08.5).
- GitHub deliveries older than GitHub's redelivery window are recovered by a reconciliation job that lists recent PR state through the API.

## 5. Restore procedure (summary)

1. Declare incident and severity (INCIDENT-RESPONSE).
2. Restore database to a new instance at the chosen point in time.
3. Run ledger verifier on the restored instance. **Do not promote until verification passes** (RES-03).
4. Restore secret references and confirm KMS key access in the target region.
5. Deploy application pointing at restored instance.
6. Run reconciliation: compare `webhook_events` terminal states and queued jobs. Re-enqueue as needed.
7. Verify with a synthetic evaluation (DEPLOYMENT §8).
8. Record restore duration against the RTO target in the results log.

## 6. Testing

- Restore test is performed before the first production release and then quarterly (RES-03, NFR-09).
- Each test restores into an isolated environment and runs the ledger verifier.
- Results are recorded with date, backup timestamp, duration and verification output. Test not run is recorded as not run.

## 7. Disaster recovery

- Region loss procedure is required before production release (TBD with OD-07).
- Customer communication template is in INCIDENT-RESPONSE.
- Evidence exported by customers remains verifiable independently of Parmana's availability (E2E-007). This is the primary disaster-recovery property for customers.
