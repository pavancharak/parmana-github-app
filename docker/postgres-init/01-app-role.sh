#!/bin/sh
# Runs once when the local PostgreSQL volume is first created.
# Creates the application login role before migrations run. The migrations
# create the role only when it is missing, so this keeps its LOGIN and password.
set -eu
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE parmana_app LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
SQL
