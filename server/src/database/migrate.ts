import fs from 'fs';
import path from 'path';
import { db, pgp } from './db';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function migrate(): Promise<void> {
  await db.none(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = new Set(
    (await db.map('SELECT name FROM schema_migrations', [], (row: { name: string }) => row.name)),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await db.tx(async (t) => {
      await t.none(sql);
      await t.none('INSERT INTO schema_migrations (name) VALUES ($<file>)', { file });
    });
    console.log(`Applied migration ${file}`);
  }

  console.log('Migrations up to date');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgp.end());
