-- Row-level security for tenant tables (ADR-0003, TEN-012, DATA-MODEL §4).
--
-- The application connects as parmana_app: a non-owner, non-superuser role
-- without BYPASSRLS. Every tenant-scoped query runs in a transaction where
-- app.tenant_id is set. If it is not set, policies return no rows (fail closed).
--
-- Tables are ENABLE'd but not FORCE'd: the table owner (the migration role) is
-- not the application role, so owner-only operations stay possible, and
-- SECURITY DEFINER functions owned by the migration role can run lookups.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parmana_app') THEN
    CREATE ROLE parmana_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Tenant from the transaction. NULL when unset, which matches no rows.
CREATE FUNCTION current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Bootstrap lookup for webhook ingress. Runs before the tenant is known, so it
-- cannot go through RLS. It returns one installation row by its GitHub
-- identifier, which the caller then uses to set the tenant for the transaction.
CREATE FUNCTION lookup_installation(p_installation_id bigint)
RETURNS TABLE (
  tenant_id            uuid,
  installation_id      bigint,
  github_account_id    bigint,
  repository_selection text,
  status               text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.tenant_id, g.installation_id, g.github_account_id, g.repository_selection, g.status
  FROM github_installations g
  WHERE g.installation_id = p_installation_id
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON tenants
  USING (id = current_tenant()) WITH CHECK (id = current_tenant());
CREATE POLICY tenant_scope ON github_installations
  USING (tenant_id = current_tenant()) WITH CHECK (tenant_id = current_tenant());
CREATE POLICY tenant_scope ON repositories
  USING (tenant_id = current_tenant()) WITH CHECK (tenant_id = current_tenant());
CREATE POLICY tenant_scope ON audit_events
  USING (tenant_id = current_tenant()) WITH CHECK (tenant_id = current_tenant());
CREATE POLICY tenant_scope ON jobs
  USING (tenant_id = current_tenant()) WITH CHECK (tenant_id = current_tenant());

-- webhook_deliveries has no tenant column. A delivery is claimed before its
-- tenant is known, and it stores only the GitHub delivery ID. It has no RLS.

GRANT USAGE ON SCHEMA public TO parmana_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, github_installations, repositories TO parmana_app;
GRANT SELECT, INSERT ON audit_events TO parmana_app;
-- INSERT ... ON CONFLICT needs SELECT on the table. RLS still limits jobs to the tenant in context.
GRANT SELECT, INSERT ON jobs, webhook_deliveries TO parmana_app;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq, jobs_id_seq TO parmana_app;
REVOKE ALL ON FUNCTION lookup_installation(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_installation(bigint) TO parmana_app;
GRANT EXECUTE ON FUNCTION current_tenant() TO parmana_app;
