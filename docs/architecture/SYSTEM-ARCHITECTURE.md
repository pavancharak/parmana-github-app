# System Architecture

Document version: 1.0
Status: Proposed for Phase 0 review

## 1. Purpose

This document defines the components of Parmana Agent Permission Control, their responsibilities, the trust boundaries between them, and the data flows for the main journeys. Requirements live in `product/`. Tenant isolation details are in `TENANT-ISOLATION.md`. GitHub-specific mechanics are in `GITHUB-INTEGRATION.md`.

## 2. Architectural principles

1. **Parmana Core is the authority.** Authorization decisions and cryptographic proof come from `parmana-core`. The GitHub App must not implement a competing policy engine (FR-07.9).
2. **The App is the customer-facing integration and enforcement product.** It owns installations, webhooks, checks, discovery, drift and workflows.
3. **Fail closed.** Any failure in policy, evidence, signing or tenant resolution yields a denied or failed result.
4. **Durable before acknowledged.** A webhook is acknowledged only after it is durably queued.
5. **Repository content is untrusted input.** Parsing is data-only (see `security/THREAT-MODEL.md`).
6. **Tenant context is explicit.** Every service operation receives a verified tenant context object. There is no ambient tenant.

## 3. Component model

```
            GitHub
   webhooks  |   ^  REST/GraphQL (installation tokens)
             v   |        checks API
+------------------------------------------------------------+
| Integration Layer                                          |
|  signature verification · installation auth · event shape |
+------------------------------------------------------------+
        |  validated event + tenant context
        v
+-----------------+        +----------------------------------+
| Durable Queue   |------->| Workers (apps/worker)            |
| (per tenant     |        |  discovery · normalization        |
|  partitioning)  |        |  drift · policy adapter           |
+-----------------+        |  approval · evidence · notify     |
                           +----------------------------------+
                                |                 |
                                v                 v
                  +------------------+   +-------------------------+
                  | PostgreSQL       |   | Parmana Core            |
                  | tenant-scoped    |   | authorization · policy  |
                  | state, audit,    |   | signing · evidence ·    |
                  | evidence ledger  |   | verification            |
                  +------------------+   +-------------------------+
                                                   |
                                                   v
                                          KMS (tenant signing keys)

API (apps/api) and Dashboard (apps/dashboard) sit beside workers and read/write through the same application services.
```

## 4. Components

| Component | Package or app | Responsibility | Must not |
| --- | --- | --- | --- |
| Integration layer | `apps/github-app/webhooks`, `packages/github-client` | Verify webhook signatures, resolve installation, validate event envelope, enqueue | Process business logic; trust payload tenant fields |
| Tenant manager | `packages/tenant-context` | Resolve verified tenant context from installation, enforce context on every call | Accept a tenant ID from the client |
| Repository scanner | `packages/agent-discovery` | Enumerate repository trees for supported paths, fetch file content at a commit SHA | Execute any repository content |
| Config parsers | `packages/config-parsers` | Parse supported formats into typed intermediate models; report malformed input | Evaluate scripts, plugins or commands |
| Capability normalizer | `packages/capability-schema` | Map intermediate models to canonical capability records | Assign unknown capabilities a safe default |
| Drift engine | `packages/drift-engine` | Compare normalized capabilities against an approved baseline | Calculate nondeterministic risk |
| Policy adapter | `packages/policy-adapter` | Map capability diffs to Core authorization requests; return decision | Contain its own decision logic |
| Approval service | `packages/approval-service` | Manage approval requests, binding, expiry and replay protection | Authorize without Core evaluation |
| Evidence adapter | `packages/evidence-adapter` | Build evidence payloads, call Core signing, persist hash-chained records | Persist unsigned decisions as final |
| Audit service | `packages/audit-service` | Append administrative events | Expose update or delete operations |
| Notification service | `apps/worker/jobs` | Deliver notifications with deduplication keys | Carry secret values |
| API | `apps/api` | Authenticated REST API for dashboard and integrations | Bypass application services |
| Dashboard | `apps/dashboard` | Presentation of tenant data | Hold authority over decisions |

## 5. Trust boundaries

| Boundary | Crossing | Control |
| --- | --- | --- |
| B1: Internet to integration layer | Webhook POST | HMAC-SHA256 signature check with constant-time comparison; body size limit; replay window on delivery ID |
| B2: Integration layer to queue | Validated event | Event schema validation; tenant derived from installation lookup |
| B3: Queue to workers | Job | Job carries tenant ID and originating delivery ID; worker re-verifies tenant context |
| B4: Workers to GitHub | Repository read and check write | Installation-scoped token, minimum permissions, short lifetime |
| B5: Repository content to parsers | Untrusted file bytes | Data-only parsing, size and depth limits, no execution |
| B6: Workers to Parmana Core | Authorization and signing request | Typed request with tenant, policy version and digest; timeout; fail closed |
| B7: Users to API and dashboard | Browser or API request | OAuth session, RBAC check, tenant check on every object reference |
| B8: Service to KMS | Signing request | IAM role per service; per-tenant key alias; no key export |

## 6. Primary data flows

### 6.1 Installation

1. GitHub sends `installation.created` to the webhook endpoint.
2. Integration layer verifies signature and records the delivery ID.
3. Tenant manager creates or finds exactly one tenant for the installation ID (AC-01.1, AC-01.2).
4. Repository list is reconciled from the installation's accessible repositories (FR-01.7).
5. Lifecycle event appended to audit history.

### 6.2 Pull request evaluation

1. `pull_request.opened`, `synchronize`, or `reopened` is received and verified.
2. Event is durably queued with delivery ID and head SHA.
3. Worker resolves tenant context and loads the active baseline and policy version.
4. Worker fetches changed files at the **head SHA** and the base SHA.
5. Parsers and normalizer produce capability sets for base and head.
6. Drift engine produces a capability diff.
7. Policy adapter calls Core for a decision bound to tenant, repository ID, PR number, head SHA, baseline version and policy version.
8. Approval service is consulted if the decision is `approval_required`.
9. Evidence adapter signs and appends the evidence record. **If the append fails, the check is not published as success** (AC-10.6).
10. Check Run published with the head SHA as `head_sha`.

### 6.3 Approval

1. Approver submits an approval for a request bound to PR, head SHA, diff hash and policy version.
2. Approval service verifies approver authority, separation of duties and expiry.
3. Approval is recorded and signed.
4. A new evaluation runs for the **same** head SHA only. A new head SHA creates a new request (AC-09.3).

## 7. Failure modes

| Failure | Behavior | Test |
| --- | --- | --- |
| Policy service unavailable or timeout | Decision `failure`; check failure; retry with backoff | AUTH-007, E2E-006 |
| Evidence persistence fails | Check not reported as success; retry; alert | CRY-012 |
| KMS unavailable | Signing fails safely; no unsigned final evidence | PERF-007 |
| GitHub API rate limit | Controlled retry using `retry-after`; no data loss | GH-015, PERF-009 |
| GitHub API unavailable | Durable retry; check left in pending state with explanation | GH-016 |
| Database connection loss | Safe recovery; jobs not acknowledged until committed | PERF-005 |
| Worker crash mid-job | Job lease expires and job is redelivered; idempotency key prevents duplicates | PERF-006 |
| Malformed config file | File marked as parse error; evaluation of PR marked failing with reason | UT-004 |
| Parser crash on crafted input | Worker isolates the file, records error, continues | SEC-PARSE-01 |
| Stale worker result | Result rejected if a newer head SHA exists | GH-018 |

## 8. Deployment shape

Described in `operations/DEPLOYMENT.md`. Summary: stateless API and worker containers; managed PostgreSQL, which also hosts the job outbox (ADR-0004); Parmana Core as a separately deployed service (ADR-0001); KMS; OpenTelemetry export.

## 9. Technology stack

| Layer | Choice | Status |
| --- | --- | --- |
| GitHub integration | GitHub App API, Octokit | Accepted (spec) |
| Backend | TypeScript, Node.js 24 | Accepted (spec) |
| Web framework | Fastify | Accepted (spec) |
| Dashboard | Next.js, React, TypeScript | Open (OD-12) |
| Database | PostgreSQL | Accepted (spec) |
| Database access | Drizzle | Accepted (ADR-0005) |
| Queue | PostgreSQL transactional outbox behind a `JobQueue` interface | Accepted (ADR-0004) |
| Auth | GitHub OAuth plus server-side sessions | Accepted (spec) |
| Crypto | Parmana Core packages | Accepted (spec) |
| Signing keys | AWS KMS | Open (OD-05) |
| Observability | OpenTelemetry | Accepted (spec) |
| Testing | Vitest, integration tests, Playwright | Accepted (spec) |
| CI | GitHub Actions | Accepted (spec) |
