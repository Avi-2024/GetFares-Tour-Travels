import dotenv from "dotenv";
import { Client as PostgresClient } from "pg";
import mysql from "mysql2/promise";

dotenv.config();

const autoConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

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

  return "postgres";
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

function createMySqlConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return parseMySqlUrl(databaseUrl);
  }

  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "MySQL clear requires DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return { host, port, user, password, database };
}

async function clearPostgresDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL clear.");
  }

  const client = new PostgresClient({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    console.log("Clearing PostgreSQL database (drop+recreate public schema)");
    await client.query("BEGIN");
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    await client.query("COMMIT");
    console.log("Database cleared successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function isSafeSqlIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ""));
}

async function clearMySqlDatabase() {
  const connection = await mysql.createConnection(createMySqlConfig());

  try {
    console.log("Clearing MySQL database (drop all tables in current schema)");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows] = await connection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
    `);

    for (const row of rows || []) {
      const tableName = row.table_name || row.TABLE_NAME;
      if (!isSafeSqlIdentifier(tableName)) {
        console.warn(`Skipping unsafe table identifier: ${String(tableName)}`);
        continue;
      }
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Database cleared successfully.");
  } catch (error) {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  if (!autoConfirm) {
    console.error(
      "Destructive operation. Please re-run with --yes or -y to confirm.",
    );
    console.error("Example: npm run db:clear -- --yes");
    process.exit(1);
  }

  const dbClient = detectDatabaseClient();
  if (dbClient === "mysql") {
    await clearMySqlDatabase();
  } else {
    await clearPostgresDatabase();
  }

  console.log("Next step: npm run db:migrate && npm run db:seed:rbac");
}

main().catch((error) => {
  console.error("Failed to clear database:", error.message);
  process.exit(1);
});
