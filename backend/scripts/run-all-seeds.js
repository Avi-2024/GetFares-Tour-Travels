const { spawn } = require('node:child_process');
const path = require('node:path');

const tasks = [
  { name: 'Database Migrations', script: 'migrate.js' },
  { name: 'RBAC Seeding', script: 'seed-rbac.js' },
  { name: 'Dummy Data Seeding', script: 'seed-dummy-data.js' },
];

async function runTask(name, scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    console.log(`\n📍 Running: ${name}...`);

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    child.on('error', (error) => {
      console.error(`❌ ${name} failed:`, error.message);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} completed successfully\n`);
        resolve();
      } else {
        reject(new Error(`${name} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🌱 Starting database seeding process...');
  console.log('═'.repeat(50));

  try {
    for (const task of tasks) {
      await runTask(task.name, task.script);
    }

    console.log('═'.repeat(50));
    console.log('\n🎉 All seeding tasks completed successfully!');
    console.log('\n📚 You can now start the backend server:');
    console.log('   npm run dev\n');
  } catch (error) {
    console.error('\n❌ Seeding process failed');
    process.exitCode = 1;
  }
}

main();
