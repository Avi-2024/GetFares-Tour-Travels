/**
 * Creates / updates `accounts` role row and two CRM users tied to it.
 * Uses same MySQL wiring as seed-rbac (DATABASE_URL=mysql://... or MYSQL_*).
 *
 * Run from backend folder:
 *   node database/scripts/seed-accounts-users.js
 *
 * Optional: SEED_ACCOUNTS_PASSWORD overrides default password below.
 *
 * RDS / TLS: auto-enables TLS for common cloud hosts. Or set MYSQL_SSL=true.
 * Local bare MySQL without TLS: MYSQL_SSL=false
 */

import fs from "node:fs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcryptjs from "bcryptjs";

dotenv.config();

const ROLE_NAME = "accounts";
const ROLE_DESCRIPTION = "Financial operations and payment tracking";

const ACCOUNTS_USERS = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    fullName: "Accounts User One",
    email: "accounts1@getfares.com",
    phone: "9800000051",
  },
  {
    id: "a2222222-2222-4222-8222-222222222202",
    fullName: "Accounts User Two",
    email: "accounts2@getfares.com",
    phone: "9800000052",
  },
];

function detectDatabaseClient() {
  const explicit = String(process.env.DATABASE_CLIENT || "")
    .trim()
    .toLowerCase();
  if (explicit === "mysql" || explicit === "mariadb") return "mysql";

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

function buildMysqlSslConfig() {
  const sslRejectUnauthorizedOverride =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  const sslCaInline = process.env.DATABASE_SSL_CA;
  const sslCaPath = process.env.DATABASE_SSL_CA_PATH;

  if (sslRejectUnauthorizedOverride === "false") {
    return { rejectUnauthorized: false };
  }

  if (sslCaInline) {
    return {
      rejectUnauthorized: true,
      ca: sslCaInline.replace(/\\n/g, "\n"),
    };
  }

  if (sslCaPath && fs.existsSync(sslCaPath)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(sslCaPath, "utf8"),
    };
  }

  return undefined;
}

function tlsDefaultForMysql2() {
  return { minVersion: "TLSv1.2", rejectUnauthorized: false };
}

function resolveMysqlSsl(hostname) {
  const flag = String(process.env.MYSQL_SSL ?? "").trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(flag)) {
    return undefined;
  }

  const custom = buildMysqlSslConfig();
  if (custom !== undefined) {
    return { ...tlsDefaultForMysql2(), ...custom };
  }

  const host = String(hostname || "").toLowerCase();
  const looksCloudTls =
    host.includes(".mysql.database.azure.com") ||
    host.includes(".rds.amazonaws.com") ||
    host.includes(".rds.") ||
    host.includes("amazonaws.com") ||
    host.includes(".db.ondigitalocean.com") ||
    host.includes(".psdb.cloud");

  if (["1", "true", "yes", "on"].includes(flag) || looksCloudTls) {
    return tlsDefaultForMysql2();
  }

  return undefined;
}

function createMySqlConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();

  const hostExplicit = process.env.MYSQL_HOST;
  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    const parsed = parseMySqlUrl(databaseUrl);
    return { ...parsed, ssl: resolveMysqlSsl(parsed.host) };
  }

  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!hostExplicit || !user || !database) {
    throw new Error(
      "MySQL seed needs DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host: hostExplicit,
    port,
    user,
    password,
    database,
    ssl: resolveMysqlSsl(hostExplicit),
  };
}

async function ensureAccountsRole(conn) {
  await conn.query(
    `
      INSERT INTO roles (id, name, description, is_active)
      VALUES (UUID(), ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        description = COALESCE(VALUES(description), description),
        is_active = 1
    `,
    [ROLE_NAME, ROLE_DESCRIPTION],
  );
  const [rows] = await conn.query(
    "SELECT id FROM roles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    [ROLE_NAME],
  );
  const id = rows?.[0]?.id;
  if (!id) throw new Error(`Role '${ROLE_NAME}' not found after upsert.`);
  return id;
}

async function upsertAccountsUser(conn, { id, fullName, email, phone }, passwordHash, roleId) {
  await conn.query(
    `
      INSERT INTO users (
        id, role_id, full_name, email, phone, password_hash, is_active, active
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        role_id = VALUES(role_id),
        full_name = VALUES(full_name),
        phone = VALUES(phone),
        password_hash = VALUES(password_hash),
        is_active = 1,
        active = 1,
        updated_at = CURRENT_TIMESTAMP
    `,
    [id, roleId, fullName, email, phone ?? null, passwordHash],
  );
}

async function main() {
  if (detectDatabaseClient() !== "mysql") {
    console.error(
      "This seed targets MySQL only. Set DATABASE_CLIENT=mysql and DATABASE_URL=mysql://... (or MYSQL_*).",
    );
    process.exit(1);
    return;
  }

  const defaultPassword =
    process.env.SEED_ACCOUNTS_PASSWORD?.trim() || "Welcome@123";
  const rounds = Number(process.env.AUTH_BCRYPT_ROUNDS || "8");
  const passwordHash = await bcryptjs.hash(defaultPassword, rounds);

  const conn = await mysql.createConnection(createMySqlConnectionConfig());

  try {
    await conn.beginTransaction();
    const roleId = await ensureAccountsRole(conn);

    for (const u of ACCOUNTS_USERS) {
      await upsertAccountsUser(conn, u, passwordHash, roleId);
      console.log(`✓ Accounts user: ${u.email} (${u.fullName})`);
    }

    await conn.commit();
    console.log(
      `\nDone. Password (unless SEED_ACCOUNTS_PASSWORD set): ${defaultPassword}`,
    );
  } catch (e) {
    await conn.rollback();
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

await main();
