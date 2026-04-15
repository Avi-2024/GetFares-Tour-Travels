/**
 * Script: Delete Users Without Role ID
 * 
 * Safely removes users who don't have a role_id assigned
 * Handles foreign key constraints properly
 */

import { createApp } from '../src/app.js';

async function deleteUsersWithoutRole() {
  console.log('🗑️  Starting User Cleanup - Delete Users Without Role ID\n');

  let appInstance;
  try {
    appInstance = createApp();
    const { container } = appInstance;
    const db = container.db;

    // Step 1: Find users without role_id
    console.log('📋 Step 1: Finding users without role_id...');
    const usersQuery = await db.query(`
      SELECT id, full_name, email, created_at
      FROM users
      WHERE role_id IS NULL
      ORDER BY created_at DESC
    `);

    const usersToDelete = usersQuery.rows;
    console.log(`Found ${usersToDelete.length} users without role_id\n`);

    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. All users have role_id assigned.\n');
      return;
    }

    // Display users
    console.log('Users to be deleted:');
    console.log('='.repeat(80));
    usersToDelete.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name || 'No Name'} (${user.email || 'No Email'})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // Step 2: Check dependencies
    console.log('📋 Step 2: Checking dependencies...');
    
    const userIds = usersToDelete.map(u => u.id);
    
    // Check assigned leads
    const leadsQuery = await db.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE assigned_to = ANY($1)
    `, [userIds]);
    
    const assignedLeadsCount = parseInt(leadsQuery.rows[0].count);
    console.log(`   Assigned Leads: ${assignedLeadsCount}`);

    // Check lead activities
    const activitiesQuery = await db.query(`
      SELECT COUNT(*) as count
      FROM lead_activities
      WHERE user_id = ANY($1)
    `, [userIds]);
    
    const activitiesCount = parseInt(activitiesQuery.rows[0].count);
    console.log(`   Lead Activities: ${activitiesCount}\n`);

    // Step 3: Confirm deletion
    console.log('⚠️  WARNING: This will:');
    console.log(`   - Delete ${usersToDelete.length} users`);
    console.log(`   - Unassign ${assignedLeadsCount} leads`);
    console.log(`   - Update ${activitiesCount} lead activities (set user_id to NULL)`);
    console.log('');

    // For safety, require manual confirmation
    console.log('To proceed, set CONFIRM_DELETE=true in the script\n');
    
    const CONFIRM_DELETE = process.env.CONFIRM_DELETE === 'true';
    
    if (!CONFIRM_DELETE) {
      console.log('❌ Deletion cancelled. Set CONFIRM_DELETE=true to proceed.');
      console.log('   Example: CONFIRM_DELETE=true node scripts/delete-users-without-role.js\n');
      return;
    }

    // Step 4: Begin transaction
    console.log('🔄 Step 3: Starting deletion process...\n');
    
    await db.query('BEGIN');

    try {
      // Unassign leads
      if (assignedLeadsCount > 0) {
        console.log('   Unassigning leads...');
        await db.query(`
          UPDATE leads 
          SET assigned_to = NULL, 
              assigned_at = NULL,
              updated_at = NOW()
          WHERE assigned_to = ANY($1)
        `, [userIds]);
        console.log(`   ✅ ${assignedLeadsCount} leads unassigned`);
      }

      // Update lead activities
      if (activitiesCount > 0) {
        console.log('   Updating lead activities...');
        await db.query(`
          UPDATE lead_activities 
          SET user_id = NULL
          WHERE user_id = ANY($1)
        `, [userIds]);
        console.log(`   ✅ ${activitiesCount} activities updated`);
      }

      // Delete users
      console.log('   Deleting users...');
      const deleteResult = await db.query(`
        DELETE FROM users 
        WHERE role_id IS NULL
        RETURNING id
      `);
      console.log(`   ✅ ${deleteResult.rowCount} users deleted\n`);

      // Commit transaction
      await db.query('COMMIT');
      console.log('✅ Transaction committed successfully\n');

      // Step 5: Verify
      console.log('📋 Step 4: Verification...');
      const verifyQuery = await db.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE role_id IS NULL
      `);
      
      const remainingCount = parseInt(verifyQuery.rows[0].count);
      console.log(`   Remaining users without role_id: ${remainingCount}`);
      
      if (remainingCount === 0) {
        console.log('   ✅ All users without role_id have been deleted\n');
      } else {
        console.log('   ⚠️  Some users still remain without role_id\n');
      }

      // Summary
      console.log('📊 Summary');
      console.log('='.repeat(80));
      console.log(`✅ Users deleted: ${deleteResult.rowCount}`);
      console.log(`✅ Leads unassigned: ${assignedLeadsCount}`);
      console.log(`✅ Activities updated: ${activitiesCount}`);
      console.log('');
      console.log('🎉 Cleanup completed successfully!\n');

    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error('❌ Error during deletion, transaction rolled back');
      throw error;
    }

  } catch (error) {
    console.error('❌ Script Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (appInstance?.container?.db?.pool) {
      await appInstance.container.db.pool.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run script
deleteUsersWithoutRole()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
