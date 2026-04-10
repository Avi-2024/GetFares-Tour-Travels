import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const REQUIRED_TABLES = [
  'roles',
  'permissions',
  'role_permissions',
  'users',
  'login_audit',
  'destinations',
  'destination_pricing',
  'campaigns',
  'leads',
  'queued_leads',
  'lead_activities',
  'followups',
  'quotations',
  'quotation_items',
  'quotation_views',
  'bookings',
  'booking_approvals',
  'booking_items',
  'payments',
  'supplier_payables',
  'supplier_payable_settlements',
  'packages',
  'package_itineraries',
  'settings',
  'token_blacklist',
  'system_datetime_preferences',
  'automation_job_runs',
  'lead_followup_alert_logs',
  'followup_workflow_history',
  'followup_status_snapshots',
  'notification_logs'
];

async function analyzeDatabase() {
  let connection;

  try {
    // Load database config from environment or config file
    const config = {
      host: process.env.DB_HOST || 'get2vacations.c16ecme0uera.ap-south-1.rds.amazonaws.com',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'get2vacations',
      port: process.env.DB_PORT || 3306
    };

    console.log('🔍 Connecting to MySQL database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully\n');

    const results = {
      connection: true,
      tables: {},
      constraints: {},
      dataIntegrity: {},
      indexes: {},
      rbac: {},
      issues: []
    };

    // 1. Check all required tables exist
    console.log('📋 Checking required tables...');
    for (const table of REQUIRED_TABLES) {
      try {
        const [rows] = await connection.execute(
          'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
          [table]
        );
        const exists = rows[0].count > 0;
        results.tables[table] = { exists };

        if (!exists) {
          results.issues.push(`Missing table: ${table}`);
          console.log(`❌ ${table} - MISSING`);
        } else {
          console.log(`✅ ${table} - EXISTS`);
        }
      } catch (error) {
        results.tables[table] = { exists: false, error: error.message };
        results.issues.push(`Error checking table ${table}: ${error.message}`);
      }
    }

    // 2. Check table structures and constraints
    console.log('\n🔗 Checking table structures and constraints...');
    for (const table of REQUIRED_TABLES) {
      if (!results.tables[table]?.exists) continue;

      try {
        // Get column info
        const [columns] = await connection.execute(
          'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION',
          [table]
        );

        // Get foreign keys
        const [foreignKeys] = await connection.execute(`
          SELECT
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM information_schema.key_column_usage
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [table]);

        // Get indexes
        const [indexes] = await connection.execute(`
          SELECT
            INDEX_NAME,
            COLUMN_NAME,
            NON_UNIQUE
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = ?
          ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `, [table]);

        results.constraints[table] = {
          columns: columns.length,
          foreignKeys: foreignKeys.length,
          indexes: indexes.length
        };

        console.log(`✅ ${table}: ${columns.length} columns, ${foreignKeys.length} FKs, ${indexes.length} indexes`);

      } catch (error) {
        results.constraints[table] = { error: error.message };
        results.issues.push(`Error analyzing ${table}: ${error.message}`);
      }
    }

    // 3. Check data integrity
    console.log('\n🔍 Checking data integrity...');

    // Check for orphaned records
    const integrityChecks = [
      {
        name: 'Users without roles',
        query: 'SELECT COUNT(*) as count FROM users WHERE role_id IS NOT NULL AND role_id NOT IN (SELECT id FROM roles)',
        table: 'users'
      },
      {
        name: 'Leads with invalid destinations',
        query: 'SELECT COUNT(*) as count FROM leads WHERE destination_id IS NOT NULL AND destination_id NOT IN (SELECT id FROM destinations)',
        table: 'leads'
      },
      {
        name: 'Leads with invalid campaigns',
        query: 'SELECT COUNT(*) as count FROM leads WHERE campaign_id IS NOT NULL AND campaign_id NOT IN (SELECT id FROM campaigns)',
        table: 'leads'
      },
      {
        name: 'Leads with invalid assignees',
        query: 'SELECT COUNT(*) as count FROM leads WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM users)',
        table: 'leads'
      },
      {
        name: 'Quotations with invalid leads',
        query: 'SELECT COUNT(*) as count FROM quotations WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads)',
        table: 'quotations'
      },
      {
        name: 'Bookings with invalid quotations',
        query: 'SELECT COUNT(*) as count FROM bookings WHERE quotation_id NOT IN (SELECT id FROM quotations)',
        table: 'bookings'
      }
    ];

    for (const check of integrityChecks) {
      try {
        const [rows] = await connection.execute(check.query);
        const count = rows[0].count;
        results.dataIntegrity[check.name] = count;

        if (count > 0) {
          results.issues.push(`${check.name}: ${count} orphaned records`);
          console.log(`⚠️  ${check.name}: ${count} issues`);
        } else {
          console.log(`✅ ${check.name}: OK`);
        }
      } catch (error) {
        results.dataIntegrity[check.name] = { error: error.message };
        results.issues.push(`Error in ${check.name}: ${error.message}`);
      }
    }

    // 4. Check RBAC setup
    console.log('\n👥 Checking RBAC setup...');

    try {
      const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
      const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      const [permCount] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
      const [rolePermCount] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions');

      results.rbac = {
        roles: roleCount[0].count,
        users: userCount[0].count,
        permissions: permCount[0].count,
        rolePermissions: rolePermCount[0].count
      };

      console.log(`✅ Roles: ${roleCount[0].count}, Users: ${userCount[0].count}, Permissions: ${permCount[0].count}, Role-Permissions: ${rolePermCount[0].count}`);

      if (roleCount[0].count === 0) {
        results.issues.push('No roles defined');
      }
      if (userCount[0].count === 0) {
        results.issues.push('No users defined');
      }

    } catch (error) {
      results.rbac = { error: error.message };
      results.issues.push(`RBAC check error: ${error.message}`);
    }

    // 5. Check recent automation runs
    console.log('\n🤖 Checking automation system...');

    try {
      const [automationRuns] = await connection.execute(`
        SELECT
          job_name,
          status,
          COUNT(*) as count,
          MAX(started_at) as last_run
        FROM automation_job_runs
        GROUP BY job_name, status
        ORDER BY job_name, status
      `);

      results.automation = automationRuns;
      console.log(`✅ Found ${automationRuns.length} automation job status records`);

      // Check for failed jobs
      const failedJobs = automationRuns.filter(r => r.status === 'FAILED');
      if (failedJobs.length > 0) {
        results.issues.push(`${failedJobs.length} automation jobs have failed`);
        console.log(`⚠️  ${failedJobs.length} failed automation jobs`);
      }

    } catch (error) {
      results.automation = { error: error.message };
      results.issues.push(`Automation check error: ${error.message}`);
    }

    // 6. Check database size and performance
    console.log('\n📊 Checking database metrics...');

    try {
      const [dbSize] = await connection.execute(`
        SELECT
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      const [tableCount] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      results.metrics = {
        sizeMB: dbSize[0].size_mb,
        tables: tableCount[0].count
      };

      console.log(`✅ Database size: ${dbSize[0].size_mb} MB, Tables: ${tableCount[0].count}`);

    } catch (error) {
      results.metrics = { error: error.message };
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 DATABASE ANALYSIS SUMMARY');
    console.log('='.repeat(50));

    console.log(`\n✅ Tables: ${Object.values(results.tables).filter(t => t.exists).length}/${REQUIRED_TABLES.length} exist`);
    console.log(`⚠️  Issues found: ${results.issues.length}`);

    if (results.issues.length > 0) {
      console.log('\n🚨 ISSUES TO ADDRESS:');
      results.issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n🎉 No critical issues found!');
    }

    // Save results to file
    const outputPath = path.join(process.cwd(), 'database-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outputPath}`);

    return results;

  } catch (error) {
    console.error('❌ Database analysis failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the analysis
analyzeDatabase().catch(console.error);