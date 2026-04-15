/**
 * seed-roles-users.js
 * Seeds: 8 fixed roles + all permissions + role-permission mappings + 1 user per role
 * Run: node scripts/seed-roles-users.js
 */

import pg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    "postgresql://postgres:Getfares123456@database-1.c16ecme0uera.ap-south-1.rds.amazonaws.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

// ─── HARD-CODED ROLES ────────────────────────────────────────────────────────
const ROLES = [
  { name: "super_admin",      description: "Full system access — cannot be modified" },
  { name: "admin",            description: "System administration and configuration" },
  { name: "manager",          description: "Team management and oversight" },
  { name: "sales_consultant", description: "Lead management and quotations" },
  { name: "visa_executive",   description: "Visa case management" },
  { name: "accounts",         description: "Payments, invoices and refunds" },
  { name: "marketing",        description: "Campaigns and lead source tracking" },
  { name: "management",       description: "Read-only executive view" },
];

// ─── ALL PERMISSIONS ─────────────────────────────────────────────────────────
const PERMISSIONS = [
  { key: "*",                      description: "All permissions (super admin only)" },
  { key: "rbac:manage",            description: "Manage roles and permissions" },
  { key: "users:read",             description: "View users" },
  { key: "users:create",           description: "Create users" },
  { key: "users:update",           description: "Update users" },
  { key: "users:delete",           description: "Delete users" },
  { key: "settings:read",          description: "View settings" },
  { key: "settings:update",        description: "Update settings" },
  { key: "leads:read",             description: "View leads" },
  { key: "leads:create",           description: "Create leads" },
  { key: "leads:update",           description: "Update leads" },
  { key: "leads:delete",           description: "Delete leads" },
  { key: "leads:*",                description: "Full leads access" },
  { key: "quotations:read",        description: "View quotations" },
  { key: "quotations:create",      description: "Create quotations" },
  { key: "quotations:update",      description: "Update quotations" },
  { key: "quotations:delete",      description: "Delete quotations" },
  { key: "quotations:*",           description: "Full quotations access" },
  { key: "bookings:read",          description: "View bookings" },
  { key: "bookings:create",        description: "Create bookings" },
  { key: "bookings:update",        description: "Update bookings" },
  { key: "bookings:*",             description: "Full bookings access" },
  { key: "payments:read",          description: "View payments" },
  { key: "payments:create",        description: "Create payments" },
  { key: "payments:update",        description: "Update payments" },
  { key: "payments:*",             description: "Full payments access" },
  { key: "refunds:read",           description: "View refunds" },
  { key: "refunds:create",         description: "Create refunds" },
  { key: "refunds:update",         description: "Update refunds" },
  { key: "refunds:*",              description: "Full refunds access" },
  { key: "customers:read",         description: "View customers" },
  { key: "customers:create",       description: "Create customers" },
  { key: "customers:update",       description: "Update customers" },
  { key: "customers:*",            description: "Full customers access" },
  { key: "campaigns:read",         description: "View campaigns" },
  { key: "campaigns:create",       description: "Create campaigns" },
  { key: "campaigns:update",       description: "Update campaigns" },
  { key: "campaigns:*",            description: "Full campaigns access" },
  { key: "visa:read",              description: "View visa cases" },
  { key: "visa:create",            description: "Create visa cases" },
  { key: "visa:update",            description: "Update visa cases" },
  { key: "visa:*",                 description: "Full visa access" },
  { key: "complaints:read",        description: "View complaints" },
  { key: "complaints:create",      description: "Create complaints" },
  { key: "complaints:update",      description: "Update complaints" },
  { key: "complaints:*",           description: "Full complaints access" },
  { key: "reports:read",           description: "View reports" },
  { key: "notifications:read",     description: "View notifications" },
  { key: "notifications:update",   description: "Update notifications" },
  { key: "suppliers:read",         description: "View suppliers" },
  { key: "suppliers:create",       description: "Create suppliers" },
  { key: "suppliers:update",       description: "Update suppliers" },
  { key: "employees:read",         description: "View employees" },
  { key: "employees:update",       description: "Update employees" },
  { key: "packages:read",          description: "View packages" },
  { key: "packages:create",        description: "Create packages" },
  { key: "packages:update",        description: "Update packages" },
  { key: "packages:*",             description: "Full packages access" },
  { key: "destinations:read",      description: "View destinations" },
  { key: "destinations:create",    description: "Create destinations" },
  { key: "destinations:update",    description: "Update destinations" },
];

// ─── ROLE → PERMISSIONS MAPPING (hard-coded) ─────────────────────────────────
const ROLE_PERMISSIONS = {
  super_admin: ["*"],
  admin: [
    "*",
  ],
  manager: [
    "users:read",
    "leads:*",
    "quotations:*",
    "bookings:*",
    "customers:*",
    "complaints:*",
    "campaigns:read",
    "visa:read",
    "payments:read",
    "refunds:read",
    "reports:read",
    "suppliers:read", "suppliers:create", "suppliers:update",
    "packages:read",
    "destinations:read",
    "notifications:read", "notifications:update",
    "employees:read",
  ],
  sales_consultant: [
    "leads:*",
    "quotations:*",
    "bookings:create", "bookings:read", "bookings:update",
    "customers:read", "customers:create", "customers:update",
    "visa:read",
    "suppliers:read", "suppliers:create", "suppliers:update",
    "complaints:create", "complaints:read",
    "packages:read",
    "destinations:read",
    "notifications:read", "notifications:update",
  ],
  visa_executive: [
    "visa:*",
    "leads:read",
    "quotations:read",
    "bookings:read",
    "customers:read",
    "complaints:read",
    "notifications:read", "notifications:update",
  ],
  accounts: [
    "payments:*",
    "refunds:*",
    "bookings:read",
    "quotations:read",
    "customers:read",
    "suppliers:read", "suppliers:update",
    "reports:read",
    "notifications:read", "notifications:update",
  ],
  marketing: [
    "campaigns:*",
    "leads:read",
    "customers:read",
    "quotations:read",
    "packages:read", "packages:create", "packages:update",
    "destinations:read",
    "reports:read",
    "notifications:read", "notifications:update",
  ],
  management: [
    "reports:read",
    "leads:read",
    "quotations:read",
    "bookings:read",
    "payments:read",
    "refunds:read",
    "visa:read",
    "campaigns:read",
    "customers:read",
    "complaints:read",
    "suppliers:read",
    "packages:read",
    "destinations:read",
    "notifications:read", "notifications:update",
  ],
};

// ─── 1 USER PER ROLE ──────────────────────────────────────────────────────────
// super_admin user already exists (admin@travel-crm.com), skip it
const USERS = [
  { role: "admin",            fullName: "Admin Manager",       email: "admin.mgr@getfares.com",   phone: "9800000001" },
  { role: "manager",          fullName: "Rahul Sharma",        email: "rahul@getfares.com",        phone: "9800000002" },
  { role: "sales_consultant", fullName: "Priya Verma",         email: "priya@getfares.com",        phone: "9800000003" },
  { role: "visa_executive",   fullName: "Sneha Joshi",         email: "sneha@getfares.com",        phone: "9800000004" },
  { role: "accounts",         fullName: "Amit Gupta",          email: "amit@getfares.com",         phone: "9800000005" },
  { role: "marketing",        fullName: "Neha Kapoor",         email: "neha@getfares.com",         phone: "9800000006" },
  { role: "management",       fullName: "Vikram Mehta",        email: "vikram@getfares.com",       phone: "9800000007" },
];

const DEFAULT_PASSWORD = "Welcome@123";

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert roles
    console.log("\n🎭 Seeding roles...");
    const roleIdMap = {};

    for (const role of ROLES) {
      const { rows } = await client.query(
        `INSERT INTO roles (name, description, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_active = TRUE
         RETURNING id, name`,
        [role.name, role.description]
      );
      roleIdMap[rows[0].name] = rows[0].id;
      console.log(`   ✓ ${rows[0].name} (${rows[0].id})`);
    }

    // 2. Upsert permissions
    console.log("\n🔐 Seeding permissions...");
    const permIdMap = {};

    for (const perm of PERMISSIONS) {
      const { rows } = await client.query(
        `INSERT INTO permissions (key, name, description, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE
         RETURNING id, key`,
        [perm.key, perm.key, perm.description]
      );
      permIdMap[rows[0].key] = rows[0].id;
    }
    console.log(`   ✓ ${PERMISSIONS.length} permissions upserted`);

    // 3. Set role permissions (replace all)
    console.log("\n🔗 Assigning permissions to roles...");
    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleIdMap[roleName];
      if (!roleId) continue;

      // Clear existing
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

      // Insert fresh
      for (const key of permKeys) {
        const permId = permIdMap[key];
        if (!permId) { console.warn(`   ⚠ Permission not found: ${key}`); continue; }
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT DO NOTHING`,
          [roleId, permId]
        );
      }
      console.log(`   ✓ ${roleName}: ${permKeys.length} permissions`);
    }

    // 4. Create users (1 per role, skip super_admin)
    console.log("\n👥 Creating users...");
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 8);

    for (const u of USERS) {
      const roleId = roleIdMap[u.role];
      if (!roleId) { console.warn(`   ⚠ Role not found: ${u.role}`); continue; }

      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (email) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               role_id   = EXCLUDED.role_id,
               is_active = TRUE
         RETURNING full_name, email`,
        [u.fullName, u.email, u.phone, passwordHash, roleId]
      );
      console.log(`   ✓ ${rows[0].full_name} (${rows[0].email}) → ${u.role}`);
    }

    await client.query("COMMIT");

    console.log("\n✅ Seed complete!");
    console.log(`\n🔑 Default password for all new users: ${DEFAULT_PASSWORD}`);
    console.log("\n📋 Summary:");
    console.log(`   Roles     : ${ROLES.length}`);
    console.log(`   Permissions: ${PERMISSIONS.length}`);
    console.log(`   Users     : ${USERS.length} new + 1 existing super_admin`);

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("\n❌ Seed failed, rolled back:", e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
