/**
 * Creates or updates one CMS user.
 *
 * Run from backend folder:
 *   node database/scripts/seed-cms-user.js
 *
 * Optional env:
 *   SEED_CMS_EMAIL, SEED_CMS_PASSWORD, SEED_CMS_NAME
 */

import fs from "node:fs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcryptjs from "bcryptjs";

dotenv.config();

const CMS_ROLE_NAME = "CMS_FULL_ACCESS";
const DEFAULT_CMS_USER = Object.freeze({
  fullName: "CMS Admin",
  email: "admin@travel-cms.com",
  password: "admin@123",
});

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

function resolveMysqlSsl(hostname) {
  const flag = String(process.env.MYSQL_SSL ?? "").trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(flag)) return undefined;

  const custom = buildMysqlSslConfig();
  if (custom) {
    return { minVersion: "TLSv1.2", rejectUnauthorized: false, ...custom };
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
    return { minVersion: "TLSv1.2", rejectUnauthorized: false };
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
  const fullName =
    String(process.env.SEED_CMS_NAME || "").trim() || DEFAULT_CMS_USER.fullName;
  const email = (
    String(process.env.SEED_CMS_EMAIL || "").trim() || DEFAULT_CMS_USER.email
  ).toLowerCase();
  const password = String(process.env.SEED_CMS_PASSWORD || DEFAULT_CMS_USER.password);

  if (password.length < 8) {
    throw new Error("SEED_CMS_PASSWORD must be at least 8 characters.");
  }

  return { fullName, email, password };
}

async function ensureCmsRole(conn) {
  await conn.query(
    `
      INSERT INTO roles (id, name, description, is_active)
      VALUES (UUID(), ?, 'CMS dashboard access', 1)
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        is_active = 1
    `,
    [CMS_ROLE_NAME],
  );

  const [rows] = await conn.query(
    "SELECT id FROM roles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    [CMS_ROLE_NAME],
  );
  const roleId = rows?.[0]?.id;
  if (!roleId) throw new Error(`Role '${CMS_ROLE_NAME}' not found.`);

  return roleId;
}

async function upsertCmsUser(conn, user, passwordHash, roleId) {
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
    const roleId = await ensureCmsRole(conn);
    await upsertCmsUser(conn, user, passwordHash, roleId);
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
