// scripts/run-migrations.mjs

import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

async function run() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  // Load migrations
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Load applied migrations
  const res = await client.query('SELECT version FROM schema_migrations');
  const applied = new Set(res.rows.map(r => r.version));

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    console.log(`Applying migration: ${file}`);

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);

    // Record version
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [file]
    );

    console.log(`Migration completed: ${file}`);
  }

  await client.end();
  console.log('All migrations done.');
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
