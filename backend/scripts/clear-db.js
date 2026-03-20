import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const autoConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

if (!dbUrl) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

if (!autoConfirm) {
  console.error(
    "❌ Destructive operation. Please re-run with --yes or -y to confirm.",
  );
  console.error("Example: npm run db:clear -- --yes");
  process.exit(1);
}

async function main() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    console.log("⚠️  Clearing database (drop+recreate public schema)");

    await client.query("BEGIN");
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    await client.query("COMMIT");

    console.log("✅ Database cleared successfully.");
    console.log("Next step: npm run db:migrate && npm run db:seed:rbac");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Failed to clear database:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
