import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { migrate } from './pg/migrate.js';

/**
 * Applies pending migrations with the migration role, then exits.
 * Usage: MIGRATION_DATABASE_URL=... node --import tsx apps/github-app/src/migrate-cli.ts
 */
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL is required');
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 1 });
try {
  const applied = await migrate(pool, fileURLToPath(new URL('../../../database/migrations', import.meta.url)));
  console.log(`migrations applied: ${applied.length}`);
} catch (err) {
  console.error(`migration failed: ${err instanceof Error ? err.name : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
