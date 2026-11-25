-- Phase 1 core schema: tenants, installations, repositories, webhook deliveries,
-- append-only audit events, and the transactional job outbox (ADR-0004).
-- Constraints follow docs/architecture/DATA-MODEL.md §4.

CREATE TABLE tenants (
  id          uuid PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per GitHub installation identity. Unique by design (AC-01.1).
CREATE TABLE github_installations (
  installation_id      bigint PRIMARY KEY,
  tenant_id            uuid NOT NULL UNIQUE REFERENCES tenants (id),
  github_account_id    bigint NOT NULL,
  repository_selection text NOT NULL CHECK (repository_selection IN ('all', 'selected')),
  status               text NOT NULL CHECK (status IN ('active', 'suspended', 'removed')),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Repository inventory. Keyed by immutable GitHub repository ID, per tenant (DATA-MODEL §2).
CREATE TABLE repositories (
  tenant_id       uuid NOT NULL REFERENCES tenants (id),
  github_repo_id  bigint NOT NULL,
  installation_id bigint NOT NULL REFERENCES github_installations (installation_id),
  full_name       text NOT NULL,
  active          boolean NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, github_repo_id)
);

-- A delivery is claimed inside the transaction that processes it, so
-- a committed claim means the delivery was fully applied (GH-008).
CREATE TABLE webhook_deliveries (
  delivery_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only administrative history (AC-13.2).
CREATE TABLE audit_events (
  id         bigserial PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES tenants (id),
  event      text NOT NULL,
  detail     jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION forbid_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

-- Transactional outbox: jobs are written in the same transaction as the event
-- they come from, so an accepted event is never lost (NFR-05).
CREATE TABLE jobs (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants (id),
  delivery_id text NOT NULL REFERENCES webhook_deliveries (delivery_id),
  kind        text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
