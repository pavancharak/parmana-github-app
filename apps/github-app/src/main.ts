import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { buildServer } from './server.js';
import { PgUnitOfWork } from './pg/pg-unit-of-work.js';
import { migrate, setAppRolePassword } from './pg/migrate.js';

/**
 * Process entry point. Configuration comes only from the environment.
 *
 * DATABASE_URL            Connection string for the application role (parmana_app). Required.
 * MIGRATION_DATABASE_URL  Connection string for the migration role. Needed only with RUN_MIGRATIONS=true.
 * APP_DB_PASSWORD        Password for the parmana_app login role. Needed only with RUN_MIGRATIONS=true.
 * RUN_MIGRATIONS          "true" to apply migrations before serving. Production runs migrations as a separate job.
 * GITHUB_WEBHOOK_SECRET   Secret configured on the GitHub App. Required.
 * PORT                    Listen port. Default 8080.
 * DATABASE_POOL_MAX       Maximum pooled connections. Default 10.
 *
 * Secrets are never printed. Startup errors print only the error name.
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../database/migrations', import.meta.url));

async function main(): Promise<void> {
  const secret = required('GITHUB_WEBHOOK_SECRET');
  const port = Number(process.env.PORT ?? 8080);
  const pool = new Pool({
    connectionString: required('DATABASE_URL'),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    statement_timeout: 10_000,
  });

  if (process.env.RUN_MIGRATIONS === 'true') {
    const migrator = new Pool({ connectionString: required('MIGRATION_DATABASE_URL'), max: 1 });
    try {
      const applied = await migrate(migrator, MIGRATIONS_DIR);
      console.log(`migrations applied: ${applied.length}`);
      // The app role has no login until a password is set. Set it on every start, so a rotated password takes effect.
      await setAppRolePassword(migrator, required('APP_DB_PASSWORD'));
      console.log('application role password set');
    } finally {
      await migrator.end();
    }
  }

  const app = buildServer({
    secret,
    uow: new PgUnitOfWork(pool),
    newTenantId: randomUUID,
    readiness: async () => {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  });

  await app.listen({ host: '0.0.0.0', port });
  console.log(`listening on ${port}`);

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down`);
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error(`startup failed: ${err instanceof Error ? err.name : 'unknown error'}`);
  process.exit(1);
});
