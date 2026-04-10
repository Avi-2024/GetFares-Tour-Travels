import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function createMySqlConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();

  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return {
      ...parseMySqlUrl(databaseUrl),
      multipleStatements: true,
    };
  }

  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "Need DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  };
}

async function main() {
  const leadIdArg = String(process.argv[2] || "").trim();
  const sqlPath = path.join(
    __dirname,
    "../database/seeds/dummy_followups.mysql.sql",
  );
  let sql = fs.readFileSync(sqlPath, "utf8");
  if (leadIdArg) {
    sql = sql.replaceAll(
      "(SELECT id FROM leads ORDER BY created_at DESC LIMIT 1)",
      `(SELECT '${leadIdArg.replace(/'/g, "''")}' FROM DUAL)`,
    );
    console.log("Targeting lead_id:", leadIdArg);
  } else {
    console.log("No lead id arg: using latest lead (ORDER BY created_at DESC).");
    console.log("Usage: npm run db:seed:dummy-followups -- <lead-uuid>");
  }
  const connection = await mysql.createConnection(createMySqlConnectionConfig());
  try {
    if (leadIdArg) {
      const [rows] = await connection.query(
        "SELECT 1 AS ok FROM leads WHERE id = ? LIMIT 1",
        [leadIdArg],
      );
      if (!rows?.length) {
        throw new Error(`No lead with id ${leadIdArg}`);
      }
    }
    const [result] = await connection.query(sql);
    const affected = Array.isArray(result)
      ? result.reduce((n, r) => n + (r?.affectedRows ?? 0), 0)
      : result?.affectedRows ?? 0;
    console.log(
      affected
        ? `Inserted rows (affectedRows sum≈${affected}). Refresh LeadDetails.`
        : "No rows inserted (lead missing or EXISTS check failed).",
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
