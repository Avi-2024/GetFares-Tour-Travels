#!/usr/bin/env node

const dotenv = require("dotenv");
const pg = require("pg");

// Load environment
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

console.log("\n🔍 AWS RDS Connection Test\n");
console.log("Database:", dbUrl.split("@")[1] || "custom");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

client.on("error", (err) => {
  console.error("❌ Client error:", err.message);
});

client.connect((err) => {
  if (err) {
    console.error("❌ Connection failed");
    console.error("Error:", err.message);
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Is AWS RDS running?");
    console.error("   2. Check Security Group - your IP must be whitelisted");
    console.error("   3. Verify DATABASE_URL in .env is correct");
    console.error("   4. Check the endpoint/port are accessible\n");
    process.exit(1);
  } else {
    console.log("✅ Connected to database!\n");

    // Get server info
    client.query(
      "SELECT version() as version, NOW() as time",
      (err, result) => {
        if (err) {
          console.error("Query error:", err);
          client.end(() => process.exit(1));
        } else {
          const row = result.rows[0];
          console.log("PostgreSQL:", row.version.split(",")[0].trim());
          console.log("Current Time:", row.time.toISOString());

          // Check tables
          client.query(
            `
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public'
        `,
            (err2, result2) => {
              if (err2) {
                console.log("\nTable check: Could not query");
              } else {
                const tableCount = result2.rows[0].count;
                console.log(`Tables: ${tableCount} found`);

                if (tableCount === 0) {
                  console.log("\n⚠️  No tables in database!");
                  console.log("Run migrations: npm run db:migrate\n");
                } else {
                  console.log("\n✨ Database is ready for use!\n");
                }
              }

              client.end(() => process.exit(0));
            },
          );
        }
      },
    );
  }
});

// Timeout handler
setTimeout(() => {
  console.error("\n❌ Connection timeout - database not responding\n");
  process.exit(1);
}, 15000);
