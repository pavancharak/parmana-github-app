# ADR-0004: Durable queue technology

Status: Proposed — decision required before Phase 1
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

## Decision needed

Owner to confirm A, B or C. Until confirmed, `architecture/SYSTEM-ARCHITECTURE.md` describes the queue abstractly.
