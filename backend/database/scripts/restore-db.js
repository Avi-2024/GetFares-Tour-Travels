import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();

function getArgValue(flag) {
  const direct = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (direct) {
    return direct.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

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

function resolveMySqlConnection() {
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
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "MySQL restore requires DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return { host, port, user, password, database };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with exit code ${code}`));
      }
    });
  });
}

async function runPostgresRestore(filePath) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".sql") {
    const command = process.env.PSQL_BIN || "psql";
    const args = [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath];
    console.log(`Starting SQL restore from: ${filePath}`);
    await runCommand(command, args);
    console.log("SQL restore completed.");
    return;
  }

  const command = process.env.PG_RESTORE_BIN || "pg_restore";
  const args = [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    databaseUrl,
    filePath,
  ];

  console.log(`Starting pg_restore from: ${filePath}`);
  await runCommand(command, args);
  console.log("Database restore completed.");
}

async function runMySqlRestore(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".sql") {
    throw new Error("MySQL restore supports .sql files only.");
  }

  const connection = resolveMySqlConnection();
  const escapedFilePath = filePath
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  const command = process.env.MYSQL_BIN || "mysql";
  const args = [
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--user=${connection.user}`,
    ...(connection.password ? [`--password=${connection.password}`] : []),
    "--database",
    connection.database,
    "--execute",
    `source "${escapedFilePath}"`,
  ];

  console.log(`Starting MySQL restore from: ${filePath}`);
  await runCommand(command, args);
  console.log("MySQL restore completed.");
}

async function main() {
  const inputFile = getArgValue("--file");
  if (!inputFile) {
    throw new Error("Please provide backup file path using --file=<path>");
  }

  if (!hasFlag("--yes")) {
    throw new Error("Restore is destructive. Re-run with --yes to confirm.");
  }

  const filePath = path.resolve(inputFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }

  const dbClient = detectDatabaseClient();
  if (dbClient === "mysql") {
    await runMySqlRestore(filePath);
  } else {
    await runPostgresRestore(filePath);
  }
}

main().catch((error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exitCode = 1;
});
