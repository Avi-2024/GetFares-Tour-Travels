const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

console.log("\n📡 Testing AWS RDS Connection...\n");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

// Connection event listeners
pool.on("error", (err) => {
  console.error("❌ Pool Error:", err.message);
});

pool.query("SELECT NOW() as time, version() as version", (err, result) => {
  if (err) {
    const displayUrl =
      process.env.DATABASE_URL.substring(0, 40) +
      "..." +
      process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 15);
    console.error("❌ Database Connection Failed");
    console.error(`   Error: ${err.message}`);
    console.error(`   URL: ${displayUrl}`);
    console.error("\n⚠️  Possible issues:");
    console.error(
      "   1. AWS RDS Security Group - Check if your IP is whitelisted",
    );
    console.error("   2. Database not running - Check AWS Console");
    console.error("   3. DATABASE_URL incorrect - Check .env file\n");
    pool.end(() => process.exit(1));
  } else {
    const displayUrl =
      process.env.DATABASE_URL.substring(0, 40) +
      "..." +
      process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 15);
    console.log("✅ Database Connection Successful!\n");
    console.log(`🔗 Connected to: ${displayUrl}`);
    console.log(`⏰ DB Time: ${result.rows[0].time}`);
    console.log(`📦 PostgreSQL: ${result.rows[0].version.split(",")[0]}\n`);

    // Now check tables
    pool.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `,
      (tableErr, tableResult) => {
        if (tableErr) {
          console.log("⚠️  Could not check tables\n");
        } else {
          const tables = tableResult.rows.map((r) => r.table_name);
          console.log(`📊 Tables in database: ${tables.length} total`);
          if (tables.length > 0) {
            console.log(
              `   ${tables.slice(0, 5).join(", ")}${tables.length > 5 ? "..." : ""}\n`,
            );
          } else {
            console.log("   ⚠️  No tables found - Run migrations first\n");
          }
        }

        pool.end(() => process.exit(0));
      },
    );
  }
});

// Timeout after 20 seconds
setTimeout(() => {
  console.error(
    "\n❌ Connection Timeout - Database not responding after 20 seconds",
  );
  console.error("   Check if AWS RDS is running and accessible from your IP\n");
  pool.end(() => process.exit(1));
}, 20000);
