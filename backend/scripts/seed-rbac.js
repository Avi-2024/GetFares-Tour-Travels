import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SEED_PATH = path.resolve(
  __dirname,
  "../database/seed-rbac.json",
);

function normalizeList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()))].filter(
    Boolean,
  );
}

async function loadSeedData() {
  const fileArgIndex = process.argv.findIndex((arg) => arg === "--file");
  const explicitPath =
    fileArgIndex !== -1 ? process.argv[fileArgIndex + 1] : null;
  const seedPath = explicitPath ? path.resolve(explicitPath) : DEFAULT_SEED_PATH;

  try {
    const raw = await fs.readFile(seedPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      seedPath,
      data: {
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
        permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
        rolePermissions:
          parsed.rolePermissions && typeof parsed.rolePermissions === "object" ?
            parsed.rolePermissions
          : {},
      },
    };
  } catch (error) {
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

async function upsertRole(client, role) {
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

async function upsertPermission(client, permission) {
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed RBAC data.");
  }

  const { seedPath, data } = await loadSeedData();

  const clientConfig = { connectionString: databaseUrl };
  if (databaseUrl.includes(".rds.") || databaseUrl.includes(".rds-")) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);
  await client.connect();

  try {
    await client.query("BEGIN");

    const roleByName = new Map();
    const permissionByKey = new Map();

    for (const role of data.roles) {
      if (!role?.name) continue;
      const record = await upsertRole(client, role);
      roleByName.set(record.name, record);
    }

    for (const permission of data.permissions) {
      if (!permission?.key) continue;
      const record = await upsertPermission(client, permission);
      permissionByKey.set(record.key, record);
    }

    for (const [roleName, permissionKeys] of Object.entries(
      data.rolePermissions || {},
    )) {
      let role = roleByName.get(roleName);
      if (!role) {
        role = await upsertRole(client, { name: roleName });
        roleByName.set(role.name, role);
      }

      const uniquePermissionKeys = normalizeList(permissionKeys);
      for (const permissionKey of uniquePermissionKeys) {
        let permission = permissionByKey.get(permissionKey);
        if (!permission) {
          permission = await upsertPermission(client, { key: permissionKey });
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
    console.log(`RBAC seed complete using: ${seedPath}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("RBAC seed failed:", error.message);
  process.exitCode = 1;
});
