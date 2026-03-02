const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const { ROLE_PERMISSIONS } = require('../src/core/constants');

async function upsertRole(client, roleName) {
  const result = await client.query(
    `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name
    `,
    [roleName, `System role: ${roleName}`],
  );

  return result.rows[0];
}

async function upsertPermission(client, permissionName) {
  const result = await client.query(
    `
      INSERT INTO permissions (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `,
    [permissionName],
  );

  return result.rows[0];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed RBAC data.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let roleCount = 0;
  let permissionCount = 0;
  let grantsCount = 0;

  try {
    await client.query('BEGIN');

    const permissionCache = new Map();

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await upsertRole(client, roleName);
      roleCount += 1;

      const uniquePermissions = [...new Set(permissions)];
      for (const permissionName of uniquePermissions) {
        let permission = permissionCache.get(permissionName);
        if (!permission) {
          permission = await upsertPermission(client, permissionName);
          permissionCache.set(permissionName, permission);
          permissionCount += 1;
        }

        await client.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id)
            DO NOTHING
          `,
          [role.id, permission.id],
        );

        grantsCount += 1;
      }
    }

    await client.query('COMMIT');

    console.log(`RBAC seed complete. Roles processed: ${roleCount}. Permissions processed: ${permissionCount}. Grants attempted: ${grantsCount}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('RBAC seed failed:', error.message);
  process.exitCode = 1;
});
