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

function formatTimestamp(date) {
  const parts = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0'),
  ];

  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
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

  const format = (getArgValue('--format') || process.env.BACKUP_FORMAT || 'custom').toLowerCase();
  if (!['custom', 'plain'].includes(format)) {
    throw new Error(`Unsupported format "${format}". Use "custom" or "plain".`);
  }

  const defaultDir = path.resolve(__dirname, '..', 'database', 'backups');
  const outputDir = path.resolve(getArgValue('--dir') || process.env.BACKUP_DIR || defaultDir);
  const providedOutput = getArgValue('--output');

  fs.mkdirSync(outputDir, { recursive: true });

  const extension = format === 'plain' ? 'sql' : 'dump';
  const fileName = providedOutput
    ? path.basename(providedOutput)
    : `travel-crm-${formatTimestamp(new Date())}.${extension}`;

  const outputPath = providedOutput
    ? path.resolve(providedOutput)
    : path.join(outputDir, fileName);

  const command = process.env.PG_DUMP_BIN || 'pg_dump';
  const args = [
    ...(format === 'custom' ? ['--format=custom'] : []),
    '--no-owner',
    '--no-privileges',
    '--file',
    outputPath,
    databaseUrl,
  ];

  console.log(`Starting backup: ${outputPath}`);
  await runCommand(command, args);
  console.log(`Backup completed: ${outputPath}`);
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});

