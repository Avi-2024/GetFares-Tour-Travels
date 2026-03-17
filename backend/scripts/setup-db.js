#!/usr/bin/env node
/**
 * Database Setup Script
 * Runs migrations, RBAC seeding, and dummy data seeding in sequence
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const scripts = [
  {
    name: 'Migrations',
    script: path.join(ROOT_DIR, 'scripts', 'migrate.js'),
    description: 'Creating database tables...',
  },
  {
    name: 'RBAC Seeding',
    script: path.join(ROOT_DIR, 'scripts', 'seed-rbac.js'),
    description: 'Seeding roles and permissions...',
  },
  {
    name: 'Dummy Data Seeding',
    script: path.join(ROOT_DIR, 'scripts', 'seed-dummy-data.js'),
    description: 'Populating test data...',
  },
];

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log('\n========================================================');
  console.log('         Travel CRM - Database Setup Script');
  console.log('========================================================\n');

  for (const item of scripts) {
    console.log(`\nRunning: ${item.name}`);
    console.log(`   ${item.description}\n`);

    try {
      await runScript(item.script);
      console.log(`\nOK: ${item.name} completed successfully.\n`);
    } catch (error) {
      console.error(`\nFAILED: ${item.name}`);
      console.error(`   ${error.message}\n`);
      process.exitCode = 1;
      return;
    }
  }

  console.log('\n========================================================');
  console.log('Database Setup Complete');
  console.log('========================================================\n');

  console.log('Database is ready for testing.\n');
  console.log('Next steps:');
  console.log('  1. Start backend server: npm run dev');
  console.log('  2. Start frontend dev server: npm run dev (in frontend folder)');
  console.log('  3. Open http://localhost:5173');
  console.log('  4. Login with test users:\n');
  console.log('     - rajesh@travel-crm.com / user@123');
  console.log('     - priya@travel-crm.com / user@123');
  console.log('     - finance@travel-crm.com / user@123\n');
}

main().catch((error) => {
  console.error('\nFatal error:', error.message);
  process.exitCode = 1;
});
