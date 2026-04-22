import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client as PostgresClient } from "pg";
import mysql from "mysql2/promise";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SEED_PATH = path.resolve(__dirname, "../database/seed-rbac.json");

function normalizeList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()))].filter(
    Boolean,
  );
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

function createMySqlConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const ssl = buildMysqlSslConfig();

  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return {
      ...parseMySqlUrl(databaseUrl),
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
      "MySQL seed requires DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
  };
}

async function loadSeedData() {
  const fileArgIndex = process.argv.findIndex((arg) => arg === "--file");
  const explicitPath =
    fileArgIndex !== -1 ? path.resolve(process.argv[fileArgIndex + 1]) : null;
  const seedPath = explicitPath || DEFAULT_SEED_PATH;

  try {
    const raw = await fsp.readFile(seedPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      seedPath,
      data: {
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
        permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
        rolePermissions:
          parsed.rolePermissions && typeof parsed.rolePermissions === "object"
            ? parsed.rolePermissions
            : {},
      },
    };
  } catch (_error) {
    if (explicitPath) {
      throw new Error(`Unable to load RBAC seed file: ${seedPath}`);
    }
    return {
      seedPath,
      data: {
        roles: [],
        permissions: [],
        rolePermissions: {},
      },
    };
  }
}

async function upsertRolePostgres(client, role) {
  const result = await client.query(
    `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name)
      DO UPDATE SET description = COALESCE(EXCLUDED.description, roles.description)
      RETURNING id, name
    `,
    [role.name, role.description || null],
  );
  return result.rows[0];
}

async function upsertPermissionPostgres(client, permission) {
  const hasKeyColumn = await client
    .query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'permissions'
          AND column_name = 'key'
        LIMIT 1
      `,
    )
    .then((result) => result.rowCount > 0);

  if (hasKeyColumn) {
    const result = await client.query(
      `
        INSERT INTO permissions ("key", name, description, is_active)
        VALUES ($1, $1, $2, COALESCE($3, TRUE))
        ON CONFLICT ("key")
        DO UPDATE SET
          name = EXCLUDED.name,
          description = COALESCE(EXCLUDED.description, permissions.description),
          is_active = COALESCE(EXCLUDED.is_active, permissions.is_active)
        RETURNING id, "key" AS key
      `,
      [permission.key, permission.description || null, permission.isActive],
    );
    return result.rows[0];
  }

  const result = await client.query(
    `
      INSERT INTO permissions (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name AS key
    `,
    [permission.key],
  );
  return result.rows[0];
}

async function runPostgresSeed(seedData) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed RBAC data.");
  }

  const clientConfig = { connectionString: databaseUrl };
  if (databaseUrl.includes(".rds.") || databaseUrl.includes(".rds-")) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new PostgresClient(clientConfig);
  await client.connect();

  try {
    await client.query("BEGIN");

    const roleByName = new Map();
    const permissionByKey = new Map();

    for (const role of seedData.roles) {
      if (!role?.name) continue;
      const record = await upsertRolePostgres(client, role);
      roleByName.set(record.name, record);
    }

    for (const permission of seedData.permissions) {
      if (!permission?.key) continue;
      const record = await upsertPermissionPostgres(client, permission);
      permissionByKey.set(record.key, record);
    }

    for (const [roleName, permissionKeys] of Object.entries(
      seedData.rolePermissions || {},
    )) {
      let role = roleByName.get(roleName);
      if (!role) {
        role = await upsertRolePostgres(client, { name: roleName });
        roleByName.set(role.name, role);
      }

      const uniquePermissionKeys = normalizeList(permissionKeys);
      for (const permissionKey of uniquePermissionKeys) {
        let permission = permissionByKey.get(permissionKey);
        if (!permission) {
          permission = await upsertPermissionPostgres(client, { key: permissionKey });
          permissionByKey.set(permission.key, permission);
        }

        await client.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `,
          [role.id, permission.id],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function upsertRoleMySql(connection, role) {
  await connection.query(
    `
      INSERT INTO roles (id, name, description, is_active)
      VALUES (UUID(), ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        description = COALESCE(VALUES(description), description),
        is_active = 1
    `,
    [role.name, role.description || null],
  );

  const [rows] = await connection.query(
    "SELECT id, name FROM roles WHERE name = ? LIMIT 1",
    [role.name],
  );
  return rows?.[0] || null;
}

async function upsertPermissionMySql(connection, permission) {
  const [columns] = await connection.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'permissions'
        AND column_name = 'key'
      LIMIT 1
    `,
  );
  const hasKeyColumn = Array.isArray(columns) && columns.length > 0;

  if (hasKeyColumn) {
    await connection.query(
      `
        INSERT INTO permissions (id, \`key\`, name, description, is_active)
        VALUES (UUID(), ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = COALESCE(VALUES(description), description),
          is_active = 1
      `,
      [permission.key, permission.key, permission.description || null],
    );

    const [rows] = await connection.query(
      "SELECT id, `key` AS `key` FROM permissions WHERE `key` = ? LIMIT 1",
      [permission.key],
    );
    return rows?.[0] || null;
  }

  await connection.query(
    `
      INSERT INTO permissions (id, name)
      VALUES (UUID(), ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `,
    [permission.key],
  );

  const [rows] = await connection.query(
    "SELECT id, name AS `key` FROM permissions WHERE name = ? LIMIT 1",
    [permission.key],
  );
  return rows?.[0] || null;
}

async function runMySqlSeed(seedData) {
  const connection = await mysql.createConnection(createMySqlConnectionConfig());

  try {
    await connection.beginTransaction();

    const roleByName = new Map();
    const permissionByKey = new Map();

    for (const role of seedData.roles) {
      if (!role?.name) continue;
      const record = await upsertRoleMySql(connection, role);
      if (record?.name) roleByName.set(record.name, record);
    }

    for (const permission of seedData.permissions) {
      if (!permission?.key) continue;
      const record = await upsertPermissionMySql(connection, permission);
      if (record?.key) permissionByKey.set(record.key, record);
    }

    for (const [roleName, permissionKeys] of Object.entries(
      seedData.rolePermissions || {},
    )) {
      let role = roleByName.get(roleName);
      if (!role) {
        role = await upsertRoleMySql(connection, { name: roleName });
        if (role?.name) roleByName.set(role.name, role);
      }
      if (!role?.id) continue;

      const uniquePermissionKeys = normalizeList(permissionKeys);
      for (const permissionKey of uniquePermissionKeys) {
        let permission = permissionByKey.get(permissionKey);
        if (!permission) {
          permission = await upsertPermissionMySql(connection, { key: permissionKey });
          if (permission?.key) permissionByKey.set(permission.key, permission);
        }
        if (!permission?.id) continue;

        await connection.query(
          `
            INSERT IGNORE INTO role_permissions (role_id, permission_id, is_active)
            VALUES (?, ?, 1)
          `,
          [role.id, permission.id],
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  const { seedPath, data } = await loadSeedData();
  const dbClient = detectDatabaseClient();

  if (dbClient === "mysql") {
    await runMySqlSeed(data);
    console.log(`RBAC seed complete using: ${seedPath}`);
    return;
  }

  await runPostgresSeed(data);
  console.log(`RBAC seed complete using: ${seedPath}`);
}

main().catch((error) => {
  console.error("RBAC seed failed:", error.message);
  process.exitCode = 1;
});
