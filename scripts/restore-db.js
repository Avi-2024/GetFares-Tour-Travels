const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

dotenv.config();

function getArgValue(flag) {
  const direct = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (direct) {
    return direct.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const inputFile = getArgValue('--file');
  if (!inputFile) {
    throw new Error('Please provide backup file path using --file=<path>');
  }

  if (!hasFlag('--yes')) {
    throw new Error('Restore is destructive. Re-run with --yes to confirm.');
  }

  const filePath = path.resolve(inputFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.sql') {
    const command = process.env.PSQL_BIN || 'psql';
    const args = [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', filePath];
    console.log(`Starting SQL restore from: ${filePath}`);
    await runCommand(command, args);
    console.log('SQL restore completed.');
    return;
  }

  const command = process.env.PG_RESTORE_BIN || 'pg_restore';
  const args = [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--dbname',
    databaseUrl,
    filePath,
  ];

  console.log(`Starting pg_restore from: ${filePath}`);
  await runCommand(command, args);
  console.log('Database restore completed.');
}

main().catch((error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exitCode = 1;
});

