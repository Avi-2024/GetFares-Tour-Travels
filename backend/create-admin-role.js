import { createDatabaseConnection } from './crm/core/database/connection.js';
import { createLogger } from './crm/core/logger/index.js';
import { config } from './crm/core/config/index.js';

const logger = createLogger({ service: 'create-admin-role' });

async function createAdminRole() {
  const db = await createDatabaseConnection({ logger, config });

  try {
    // Check if admin role exists
    const existingRole = await db.query(
      'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
      ['admin']
    );

    let roleId;
    if (existingRole.rows && existingRole.rows.length > 0) {
      roleId = existingRole.rows[0].id;
      logger.info({ roleId }, 'Admin role already exists');
    } else {
      // Create admin role
      const result = await db.query(
        'INSERT INTO roles (id, name, description, is_active) VALUES (UUID(), ?, ?, TRUE)',
        ['admin', 'Administrator with full system access']
      );
      roleId = result.insertId;
      logger.info({ roleId }, 'Admin role created');
    }

    // Get all permissions
    const permissions = await db.query('SELECT id, `key` FROM permissions WHERE is_active = TRUE');
    
    logger.info({ count: permissions.rows.length }, 'Found permissions');

    // Assign all permissions to admin role
    for (const permission of permissions.rows) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id, is_active) 
         VALUES (?, ?, TRUE) 
         ON DUPLICATE KEY UPDATE is_active = TRUE`,
        [roleId, permission.id]
      );
    }

    logger.info('All permissions assigned to admin role');

    // Get admin user
    const adminUser = await db.query(
      'SELECT id, email FROM users WHERE email = ? LIMIT 1',
      ['admin@travel-crm.com']
    );

    if (adminUser.rows && adminUser.rows.length > 0) {
      // Assign admin role to user
      await db.query(
        'UPDATE users SET role_id = ? WHERE id = ?',
        [roleId, adminUser.rows[0].id]
      );
      logger.info({ userId: adminUser.rows[0].id }, 'Admin role assigned to user');
    }

    logger.info('Admin role setup complete!');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create admin role');
    process.exit(1);
  }
}

createAdminRole();
