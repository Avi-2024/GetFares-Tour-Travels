/**
 * Creates or updates one CRM super admin user.
 *
 * Run from backend folder:
 *   SEED_SUPER_ADMIN_EMAIL="admin@example.com" \
 *   SEED_SUPER_ADMIN_PASSWORD="change-me" \
 *   node database/scripts/seed-super-admin-user.js
 */

import fs from "node:fs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcryptjs from "bcryptjs";

dotenv.config();

const ROLE_NAME = "super_admin";
const ROLE_DESCRIPTION = "Full system access";
const DEFAULT_FULL_NAME = "Super Admin";

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
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }

  if (process.env.DATABASE_SSL_CA) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
    };
  }

  if (
    process.env.DATABASE_SSL_CA_PATH &&
    fs.existsSync(process.env.DATABASE_SSL_CA_PATH)
  ) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DATABASE_SSL_CA_PATH, "utf8"),
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

  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    const parsed = parseMySqlUrl(databaseUrl);
    return { ...parsed, ssl: resolveMysqlSsl(parsed.host) };
  }

  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "MySQL seed needs DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: resolveMysqlSsl(host),
  };
}

function getSeedUser() {
  const email = String(process.env.SEED_SUPER_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.SEED_SUPER_ADMIN_PASSWORD || "");
  const fullName =
    String(process.env.SEED_SUPER_ADMIN_NAME || "").trim() || DEFAULT_FULL_NAME;

  if (!email) {
    throw new Error("SEED_SUPER_ADMIN_EMAIL is required.");
  }

  if (password.length < 8) {
    throw new Error("SEED_SUPER_ADMIN_PASSWORD must be at least 8 characters.");
  }

  return { email, password, fullName };
}

async function ensureSuperAdminRole(conn) {
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
  const roleId = rows?.[0]?.id;
  if (!roleId) throw new Error(`Role '${ROLE_NAME}' not found after upsert.`);

  return roleId;
}

async function ensureWildcardPermission(conn, roleId) {
  await conn.query(
    `
      INSERT INTO permissions (id, \`key\`, name, description, is_active)
      VALUES (UUID(), '*', '*', 'All permissions', 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = COALESCE(VALUES(description), description),
        is_active = 1
    `,
  );

  const [rows] = await conn.query(
    "SELECT id FROM permissions WHERE `key` = '*' LIMIT 1",
  );
  const permissionId = rows?.[0]?.id;
  if (!permissionId) throw new Error("Wildcard permission not found.");

  await conn.query(
    `
      INSERT INTO role_permissions (role_id, permission_id, is_active)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE is_active = 1
    `,
    [roleId, permissionId],
  );
}

async function upsertSuperAdminUser(conn, user, passwordHash, roleId) {
  await conn.query(
    `
      INSERT INTO users (
        id, role_id, full_name, email, phone, password_hash, is_active, active
      )
      VALUES (UUID(), ?, ?, ?, NULL, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        role_id = VALUES(role_id),
        full_name = VALUES(full_name),
        password_hash = VALUES(password_hash),
        is_active = 1,
        active = 1,
        updated_at = CURRENT_TIMESTAMP
    `,
    [roleId, user.fullName, user.email, passwordHash],
  );
}

async function getCreatedUser(conn, email) {
  const [rows] = await conn.query(
    `
      SELECT u.id, u.email, u.full_name, r.name AS role_name, u.is_active, u.active
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );
  return rows?.[0] || null;
}

async function main() {
  if (detectDatabaseClient() !== "mysql") {
    throw new Error(
      "This seed targets MySQL only. Set DATABASE_CLIENT=mysql and MYSQL_* config.",
    );
  }

  const user = getSeedUser();
  const rounds = Number(process.env.AUTH_BCRYPT_ROUNDS || "8");
  const passwordHash = await bcryptjs.hash(user.password, rounds);
  const conn = await mysql.createConnection(createMySqlConnectionConfig());

  try {
    await conn.beginTransaction();
    const roleId = await ensureSuperAdminRole(conn);
    await ensureWildcardPermission(conn, roleId);
    await upsertSuperAdminUser(conn, user, passwordHash, roleId);
    await conn.commit();

    const created = await getCreatedUser(conn, user.email);
    console.log(
      JSON.stringify(
        {
          success: true,
          email: created?.email,
          fullName: created?.full_name,
          role: created?.role_name,
          isActive: Boolean(created?.is_active),
          active: Boolean(created?.active),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

await main();
