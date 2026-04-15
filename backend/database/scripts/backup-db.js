import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      "MySQL backup requires DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return { host, port, user, password, database };
}

function formatTimestamp(date) {
  const parts = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ];

  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
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

async function runPostgresBackup({ outputPath, format }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!["custom", "plain"].includes(format)) {
    throw new Error(`Unsupported format "${format}". Use "custom" or "plain".`);
  }

  const command = process.env.PG_DUMP_BIN || "pg_dump";
  const args = [
    ...(format === "custom" ? ["--format=custom"] : []),
    "--no-owner",
    "--no-privileges",
    "--file",
    outputPath,
    databaseUrl,
  ];

  await runCommand(command, args);
}

async function runMySqlBackup({ outputPath, format }) {
  if (format !== "plain") {
    throw new Error('MySQL backup supports only "plain" format (.sql).');
  }

  const connection = resolveMySqlConnection();
  const command = process.env.MYSQL_DUMP_BIN || "mysqldump";
  const args = [
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--user=${connection.user}`,
    ...(connection.password ? [`--password=${connection.password}`] : []),
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    "--events",
    "--set-gtid-purged=OFF",
    "--result-file",
    outputPath,
    connection.database,
  ];

  await runCommand(command, args);
}

async function main() {
  const dbClient = detectDatabaseClient();
  const requestedFormat = (
    getArgValue("--format") ||
    process.env.BACKUP_FORMAT ||
    (dbClient === "mysql" ? "plain" : "custom")
  ).toLowerCase();

  const defaultDir = path.resolve(__dirname, "..", "database", "backups");
  const outputDir = path.resolve(
    getArgValue("--dir") || process.env.BACKUP_DIR || defaultDir,
  );
  const providedOutput = getArgValue("--output");

  fs.mkdirSync(outputDir, { recursive: true });

  const extension =
    requestedFormat === "plain" || dbClient === "mysql" ? "sql" : "dump";
  const fileName = providedOutput
    ? path.basename(providedOutput)
    : `travel-crm-${formatTimestamp(new Date())}.${extension}`;

  const outputPath = providedOutput
    ? path.resolve(providedOutput)
    : path.join(outputDir, fileName);

  console.log(`Starting ${dbClient} backup: ${outputPath}`);
  if (dbClient === "mysql") {
    await runMySqlBackup({ outputPath, format: requestedFormat });
  } else {
    await runPostgresBackup({ outputPath, format: requestedFormat });
  }
  console.log(`Backup completed: ${outputPath}`);
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});
