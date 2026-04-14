/**
 * Ensures `super_admin` role + all permissions, then creates/updates one user.
 *
 * Uses the same DB config as the API (MYSQL_* / DB_* from env or crm config).
 *
 * Run: node create-super-admin.js
 *
 * Optional env (defaults shown):
 *   SUPER_ADMIN_EMAIL=get2vacations@gmail.com
 *   SUPER_ADMIN_NAME=Super Admin
 *   SUPER_ADMIN_PASSWORD=12345678
 */
import { createDatabaseConnection } from "./crm/core/database/connection.js";
import { createLogger } from "./crm/core/logger/index.js";
import { config } from "./crm/core/config/index.js";
import bcrypt from "bcrypt";

const logger = createLogger({ service: "create-super-admin" });

const SUPER_ADMIN_EMAIL =
  String(process.env.SUPER_ADMIN_EMAIL || "").trim() ||
  "get2vacations@gmail.com";
const SUPER_ADMIN_NAME =
  String(process.env.SUPER_ADMIN_NAME || "").trim() || "Super Admin";
const PLAIN_PASSWORD =
  String(process.env.SUPER_ADMIN_PASSWORD || "").trim() || "12345678";

async function createSuperAdmin() {
  if (PLAIN_PASSWORD.length < 8) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD must be at least 8 characters (set env or use default).",
    );
  }

  const db = createDatabaseConnection({ config, logger });

  try {
    const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, 10);

    let roleRows = await db.query(
      "SELECT id FROM roles WHERE name = ? LIMIT 1",
      ["super_admin"],
    );

    let roleId;
    if (roleRows.rows?.length) {
      roleId = roleRows.rows[0].id;
      logger.info({ roleId }, "Super admin role exists");
    } else {
      await db.query(
        `INSERT INTO roles (id, name, description, is_active)
         VALUES (UUID(), ?, ?, TRUE)`,
        ["super_admin", "Super Administrator with full system access"],
      );
      roleRows = await db.query(
        "SELECT id FROM roles WHERE name = ? LIMIT 1",
        ["super_admin"],
      );
      roleId = roleRows.rows[0].id;
      logger.info({ roleId }, "Super admin role created");
    }

    const permissions = await db.query(
      "SELECT id FROM permissions WHERE is_active = TRUE",
    );

    for (const permission of permissions.rows || []) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id, is_active)
         VALUES (?, ?, TRUE)
         ON DUPLICATE KEY UPDATE is_active = TRUE`,
        [roleId, permission.id],
      );
    }

    logger.info(
      { count: permissions.rows?.length ?? 0 },
      "Permissions linked to super_admin",
    );

    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [SUPER_ADMIN_EMAIL],
    );

    if (existingUser.rows?.length) {
      await db.query(
        `UPDATE users
         SET password_hash = ?, role_id = ?, is_active = TRUE, full_name = COALESCE(full_name, ?)
         WHERE email = ?`,
        [hashedPassword, roleId, SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL],
      );
      logger.info({ email: SUPER_ADMIN_EMAIL }, "User password and role updated");
    } else {
      await db.query(
        `INSERT INTO users (id, email, full_name, password_hash, role_id, is_active)
         VALUES (UUID(), ?, ?, ?, ?, TRUE)`,
        [SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, hashedPassword, roleId],
      );
      logger.info({ email: SUPER_ADMIN_EMAIL }, "User created");
    }

    logger.info("Super admin setup complete");
  } catch (error) {
    logger.error({ err: error }, "Failed");
    process.exitCode = 1;
    throw error;
  } finally {
    if (typeof db?.close === "function") {
      await db.close();
    }
  }
}

createSuperAdmin()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch(() => {
    process.exit(1);
  });
