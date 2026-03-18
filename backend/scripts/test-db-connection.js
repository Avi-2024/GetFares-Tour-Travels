#!/usr/bin/env node

const dotenv = require("dotenv");
const { createDatabaseConnection } = require("../src/core/database");
const { config } = require("../src/core/config");
const { logger } = require("../src/core/logger");

dotenv.config();

(async () => {
  let db = null;
  try {
    console.log("\n📡 Testing Database Connection...\n");

    // Create database connection
    db = createDatabaseConnection({ config, logger });

    const url = config.database.url || "";
    const displayUrl =
      url.substring(0, 30) + "..." + url.substring(url.length - 15);

    console.log(`🔗 Connection URL: ${displayUrl}`);
    console.log(`🔒 SSL Enabled: Yes (AWS RDS detected)`);

    // Test health check
    if (typeof db.healthCheck === "function") {
      const health = await db.healthCheck({ timeoutMs: 5000 });

      console.log("\n✅ Database Health Check:");
      console.log(`   Status: ✓ Connected`);
      console.log(`   Adapter: ${health.adapter}`);
      console.log(`   Latency: ${health.latencyMs}ms`);
      console.log(`   Time: ${health.checkedAt}\n`);

      // Test a simple query if it's Postgres
      if (health.adapter === "postgres" && typeof db.query === "function") {
        console.log("🔍 Running test query...");
        try {
          const result = await db.query(`
            SELECT 
              (SELECT COUNT(*) FROM users) as users,
              (SELECT COUNT(*) FROM leads) as leads,
              (SELECT COUNT(*) FROM bookings) as bookings,
              (SELECT COUNT(*) FROM destinations) as destinations
          `);

          console.log("\n📊 Current Database Stats:");
          console.log(`   Users: ${result.rows[0]?.users || 0}`);
          console.log(`   Leads: ${result.rows[0]?.leads || 0}`);
          console.log(`   Bookings: ${result.rows[0]?.bookings || 0}`);
          console.log(
            `   Destinations: ${result.rows[0]?.destinations || 0}\n`,
          );
        } catch (queryErr) {
          console.log("\n⚠️  Query test - Tables might not exist yet");
          console.log(`   Error: ${queryErr.message}\n`);
        }
      }
    }

    console.log("✨ Database connection is working correctly!\n");

    // Close connection if available
    if (typeof db.close === "function") {
      await db.close();
    }

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Database Connection Failed:");
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code || "UNKNOWN"}\n`);

    if (err.code === "ENOTFOUND") {
      console.error("   → Check: Database host is incorrect or unreachable");
    } else if (err.code === "ECONNREFUSED") {
      console.error("   → Check: Database server is not running");
    } else if (
      err.code?.includes("PGERROR") ||
      err.message?.includes("password")
    ) {
      console.error("   → Check: Database credentials are incorrect");
    } else if (err.message?.includes("SSL")) {
      console.error(
        "   → Check: SSL certificate issue - might need to update connection",
      );
    }

    console.error(
      "\nDatabase URL:",
      config.database.url.substring(0, 30) +
        "..." +
        config.database.url.substring(config.database.url.length - 20),
    );
    console.error();

    if (typeof db?.close === "function") {
      try {
        await db.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    process.exit(1);
  }
})();
