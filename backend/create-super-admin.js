import { createDatabaseConnection } from './crm/core/database/connection.js';
import { createLogger } from './crm/core/logger/index.js';
import { config } from './crm/core/config/index.js';
import bcrypt from 'bcrypt';

const logger = createLogger({ service: 'create-super-admin' });

async function createSuperAdmin() {
  const db = await createDatabaseConnection({ logger, config });

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Check if super admin role exists
    const existingRole = await db.query(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      ['super_admin']
    );

    let roleId;
    if (existingRole.rows && existingRole.rows.length > 0) {
      roleId = existingRole.rows[0].id;
      logger.info({ roleId }, 'Super admin role exists');
    } else {
      // Create super admin role
      const result = await db.query(
        'INSERT INTO roles (id, name, description, is_active) VALUES (UUID(), ?, ?, TRUE)',
        ['super_admin', 'Super Administrator with full system access']
      );
      roleId = result.insertId;
      logger.info({ roleId }, 'Super admin role created');
    }

    // Get all permissions
    const permissions = await db.query('SELECT id FROM permissions WHERE is_active = TRUE');
    
    // Assign all permissions to super admin role
    for (const permission of permissions.rows) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id, is_active) 
         VALUES (?, ?, TRUE) 
         ON DUPLICATE KEY UPDATE is_active = TRUE`,
        [roleId, permission.id]
      );
    }

    logger.info({ count: permissions.rows.length }, 'Permissions assigned');

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      ['get2vacations@gmail.com']
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      // Update existing user
      await db.query(
        'UPDATE users SET password_hash = ?, role_id = ?, is_active = TRUE WHERE email = ?',
        [hashedPassword, roleId, 'get2vacations@gmail.com']
      );
      logger.info('User updated');
    } else {
      // Create new user
      await db.query(
        `INSERT INTO users (id, email, password_hash, role_id, is_active) 
         VALUES (UUID(), ?, ?, ?, TRUE)`,
        ['get2vacations@gmail.com', hashedPassword, roleId]
      );
      logger.info('User created');
    }

    logger.info('Super admin setup complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Failed');
    process.exit(1);
  }
}

createSuperAdmin();
