const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const MIGRATIONS_DIR = path.resolve(__dirname, '../database/migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations(client) {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((file) => file.endsWith('.sql')).sort();
}

async function runMigration(client, filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(fullPath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const executed = await getExecutedMigrations(client);
    const files = await getMigrationFiles();
    const pending = files.filter((file) => !executed.has(file));

    if (!pending.length) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      await runMigration(client, file);
    }

    console.log(`Migration completed. Applied ${pending.length} file(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
