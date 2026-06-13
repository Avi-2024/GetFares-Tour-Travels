import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

// Only import pg if needed
let PostgresClient;
try {
  const pgModule = await import('pg');
  PostgresClient = pgModule.Client;
} catch {
  // pg not installed, that's fine if we're using MySQL
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

function detectDatabaseClient() {
  const explicit = String(process.env.DATABASE_CLIENT || "")
    .trim()
    .toLowerCase();
  if (explicit === "mysql" || explicit === "mariadb") return "mysql";
  if (explicit === "postgres" || explicit === "postgresql" || explicit === "pg") {
    return "postgres";
  }

  const url = String(process.env.DATABASE_URL || "")
    .trim()
    .toLowerCase();
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) return "mysql";
  if (process.env.MYSQL_HOST || process.env.MYSQL_DATABASE) return "mysql";

  return "mysql";
}

async function getMigrationFiles(dbClient) {
  const files = await fs.readdir(MIGRATIONS_DIR);
  const selected =
    dbClient === "mysql"
      ? files.filter((file) => /^\d+_.+\.mysql\.sql$/i.test(file))
      : files.filter(
          (file) => /^\d+_.+\.sql$/i.test(file) && !file.endsWith(".mysql.sql"),
        );
  return selected.sort();
}

async function ensureMigrationsTablePostgres(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureMigrationsTableMySql(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrationsPostgres(client) {
  const result = await client.query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
}

async function getExecutedMigrationsMySql(connection) {
  const [rows] = await connection.query("SELECT filename FROM schema_migrations");
  return new Set((rows || []).map((row) => row.filename));
}

async function runMigrationPostgres(client, filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(fullPath, "utf8");

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function runMigrationMySql(connection, filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(fullPath, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        if (isIgnorableMySqlMigrationError(error)) {
          console.warn(
            `Skipped already-applied MySQL statement (${error.code || "UNKNOWN"}).`,
          );
          continue;
        }
        throw error;
      }
    }

    await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [
      filename,
    ]);
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    throw error;
  }
}

function isIgnorableMySqlMigrationError(error) {
  const ignorableCodes = new Set([
    "ER_TABLE_EXISTS_ERROR",
    "ER_DUP_KEYNAME",
    "ER_DUP_FIELDNAME",
    "ER_FK_DUP_NAME",
    "ER_DUP_INDEX",
    "ER_CHECK_CONSTRAINT_DUP_NAME",
  ]);

  return ignorableCodes.has(String(error?.code || ""));
}

function parseMySqlUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent((parsed.pathname || "").replace(/^\//, "")),
  };
}

function buildMysqlSslConfig() {
  const mysqlSsl = String(process.env.MYSQL_SSL || "")
    .trim()
    .toLowerCase();
  const sslRejectUnauthorizedOverride =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  const sslCaInline = process.env.DATABASE_SSL_CA;
  const sslCaPath = process.env.DATABASE_SSL_CA_PATH;

  // Check if SSL is explicitly enabled
  if (["1", "true", "yes", "on"].includes(mysqlSsl)) {
    return {
      minVersion: "TLSv1.2",
      rejectUnauthorized: false,
    };
  }

  // Check if SSL is explicitly disabled
  if (["0", "false", "no", "off"].includes(mysqlSsl)) {
    return undefined;
  }

  if (sslRejectUnauthorizedOverride === "false") {
    return { rejectUnauthorized: false };
  }

  if (sslCaInline) {
    return {
      rejectUnauthorized: true,
      ca: sslCaInline.replace(/\\n/g, "\n"),
    };
  }

  if (sslCaPath && fsSync.existsSync(sslCaPath)) {
    return {
      rejectUnauthorized: true,
      ca: fsSync.readFileSync(sslCaPath, "utf8"),
    };
  }

  return undefined;
}

function createMySqlConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const ssl = buildMysqlSslConfig();

  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return {
      ...parseMySqlUrl(databaseUrl),
      multipleStatements: true,
      ssl,
    };
  }

  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "MySQL migration requires DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    ssl,
  };
}

async function runPostgresMigrations() {
  if (!PostgresClient) {
    throw new Error("PostgreSQL client (pg) is not installed. Run: npm install pg");
  }
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run PostgreSQL migrations.");
  }

  const clientConfig = { connectionString: databaseUrl };
  if (databaseUrl.includes(".rds.") || databaseUrl.includes(".rds-")) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new PostgresClient(clientConfig);
  await client.connect();

  try {
    await ensureMigrationsTablePostgres(client);
    const executed = await getExecutedMigrationsPostgres(client);
    const files = await getMigrationFiles("postgres");
    const pending = files.filter((file) => !executed.has(file));

    if (!pending.length) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      await runMigrationPostgres(client, file);
    }

    console.log(`Migration completed. Applied ${pending.length} file(s).`);
  } finally {
    await client.end();
  }
}

async function runMySqlMigrations() {
  const connection = await mysql.createConnection(createMySqlConnectionConfig());

  try {
    await ensureMigrationsTableMySql(connection);
    const executed = await getExecutedMigrationsMySql(connection);
    const files = await getMigrationFiles("mysql");

    if (!files.length) {
      throw new Error(
        "No MySQL migration files found. Add files like 001_initial.mysql.sql in backend/database/migrations.",
      );
    }

    const pending = files.filter((file) => !executed.has(file));
    if (!pending.length) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      await runMigrationMySql(connection, file);
    }

    console.log(`Migration completed. Applied ${pending.length} file(s).`);
  } finally {
    await connection.end();
  }
}

async function main() {
  const dbClient = detectDatabaseClient();
  if (dbClient === "mysql") {
    await runMySqlMigrations();
    return;
  }
  await runPostgresMigrations();
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
