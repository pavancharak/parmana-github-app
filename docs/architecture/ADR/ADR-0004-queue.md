# ADR-0004: Durable queue technology

Status: Accepted (2026-11-25, owner decision): Option A
Date: 2026-11-25
Decision owner: Pavan Charak

## Context

Webhooks must be durably queued before acknowledgement, retried with backoff and jitter, dead-lettered when exhausted, and recovered after worker crashes (NFR-05, FR-08). The spec allows Redis with BullMQ or a managed durable queue.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| A. PostgreSQL-backed job table with leases (`SELECT … FOR UPDATE SKIP LOCKED`) | One durable store; transactional with decisions; no extra infrastructure | Throughput ceiling; custom retry logic |
| B. Redis + BullMQ | Mature retry, delay, concurrency primitives | Redis durability configuration must be proven; another stateful system |
| C. Managed cloud queue (e.g. SQS) plus DB for state | Durable, operated by provider | Cross-system consistency needs outbox pattern |

## Recommendation

Option A for Release 1.0: transactional outbox in PostgreSQL. It keeps "accepted event" and "tenant state" in one transaction, which simplifies the no-event-loss guarantee. Revisit if measured throughput (PERF-002) cannot be met.

## Decision

Option A: PostgreSQL transactional outbox with leased jobs (`FOR UPDATE SKIP LOCKED`), accepted as the long-term queue.

- Queue access goes through a `JobQueue` interface in `packages/`. No service calls PostgreSQL job tables directly. This keeps the option to replace the backing store with a dedicated queue through a superseding ADR, without changing callers.
- Replacing the queue requires a new ADR and a measured result showing PERF-002 cannot be met. Speculation is not grounds for replacement.
- Every job carries its tenant ID and idempotency key (`architecture/TENANT-ISOLATION.md` §3).
