/**
 * Upserts dummy Meta-style fields on one lead (default: 71acb081-659c-48c8-a195-c85cabd188b3).
 *
 * Run from backend folder:
 *   node database/scripts/seed-lead-71acb081-dummy.js
 *   node database/scripts/seed-lead-71acb081-dummy.js <other-lead-uuid>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEFAULT_LEAD_ID = "71acb081-659c-48c8-a195-c85cabd188b3";

function parseMySqlUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent((parsed.pathname || "").replace(/^\//, "")),
  };
}

function buildMysqlSslConfig() {
  const mysqlSsl = String(process.env.MYSQL_SSL || "")
    .trim()
    .toLowerCase();
  if (["1", "true", "yes", "on"].includes(mysqlSsl)) {
    return { minVersion: "TLSv1.2", rejectUnauthorized: false };
  }
  if (["0", "false", "no", "off"].includes(mysqlSsl)) {
    return undefined;
  }
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }
  if (process.env.DATABASE_SSL_CA) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
    };
  }
  if (process.env.DATABASE_SSL_CA_PATH && fs.existsSync(process.env.DATABASE_SSL_CA_PATH)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DATABASE_SSL_CA_PATH, "utf8"),
    };
  }
  return undefined;
}

function createMySqlConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const ssl = buildMysqlSslConfig();
  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return { ...parseMySqlUrl(databaseUrl), multipleStatements: true, ssl };
  }
  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  if (!host || !user || !database) {
    throw new Error("Need DATABASE_URL or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.");
  }
  return { host, port, user, password, database, multipleStatements: true, ssl };
}

const DYNAMIC_FIELDS = {
  which_destination_would_you_like_to_visit: "bali",
  who_will_you_be_travelling_with: "couple",
  how_soon_are_you_planning_to_book_your_package: "within_2_weeks",
  what_is_your_budget_per_person: "40k_-_75k",
  which_destinations_are_you_interested_in_you_can_mention_multiple: "Bali, Singapore",
};

const DYNAMIC_LABELS = {
  which_destination_would_you_like_to_visit: "Which destination would you like to visit?",
  who_will_you_be_travelling_with: "Who will you be travelling with?",
  how_soon_are_you_planning_to_book_your_package:
    "How soon are you planning to book your package?",
  what_is_your_budget_per_person: "What is your budget per person?",
  which_destinations_are_you_interested_in_you_can_mention_multiple:
    "Which destinations are you interested in? (you can mention multiple)",
};

const ROWS = [
  [
    "which_destination_would_you_like_to_visit",
    DYNAMIC_LABELS.which_destination_would_you_like_to_visit,
    DYNAMIC_FIELDS.which_destination_would_you_like_to_visit,
  ],
  [
    "who_will_you_be_travelling_with",
    DYNAMIC_LABELS.who_will_you_be_travelling_with,
    DYNAMIC_FIELDS.who_will_you_be_travelling_with,
  ],
  [
    "how_soon_are_you_planning_to_book_your_package",
    DYNAMIC_LABELS.how_soon_are_you_planning_to_book_your_package,
    DYNAMIC_FIELDS.how_soon_are_you_planning_to_book_your_package,
  ],
  [
    "what_is_your_budget_per_person",
    DYNAMIC_LABELS.what_is_your_budget_per_person,
    DYNAMIC_FIELDS.what_is_your_budget_per_person,
  ],
  [
    "which_destinations_are_you_interested_in_you_can_mention_multiple",
    DYNAMIC_LABELS.which_destinations_are_you_interested_in_you_can_mention_multiple,
    DYNAMIC_FIELDS.which_destinations_are_you_interested_in_you_can_mention_multiple,
  ],
];

async function main() {
  const leadId = String(process.argv[2] || DEFAULT_LEAD_ID).trim();
  const conn = await mysql.createConnection(createMySqlConnectionConfig());
  try {
    const [[row]] = await conn.query("SELECT id FROM leads WHERE id = ? LIMIT 1", [leadId]);
    if (!row) {
      console.error(`No lead with id=${leadId}`);
      process.exitCode = 1;
      return;
    }

    await conn.query(
      `UPDATE leads SET
        city = 'Mumbai',
        travel_to = ?,
        destination_id = NULL,
        platform = 'meta',
        campaign_name = '5 Packages Leads | India | 14 April',
        ad_name = 'Broad Audience || Reel ad',
        full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Dummy Meta Lead'),
        email = COALESCE(NULLIF(TRIM(email), ''), 'dummy.meta.lead@example.com'),
        phone = COALESCE(NULLIF(TRIM(phone), ''), '+919999999999'),
        dynamic_fields = CAST(? AS JSON),
        dynamic_field_labels = CAST(? AS JSON),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        DYNAMIC_FIELDS.which_destinations_are_you_interested_in_you_can_mention_multiple.slice(
          0,
          150,
        ),
        JSON.stringify(DYNAMIC_FIELDS),
        JSON.stringify(DYNAMIC_LABELS),
        leadId,
      ],
    );

    await conn.query(
      "DELETE FROM lead_dynamic_fields WHERE BINARY lead_id = BINARY ?",
      [leadId],
    );
    for (const [fieldKey, fieldLabel, fieldValue] of ROWS) {
      await conn.query(
        `INSERT INTO lead_dynamic_fields (id, lead_id, field_key, field_label, field_value)
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), leadId, fieldKey, fieldLabel, fieldValue],
      );
    }

    const [[out]] = await conn.query(
      "SELECT id, full_name, city, travel_to, platform, campaign_name, ad_name FROM leads WHERE id = ?",
      [leadId],
    );
    console.log("Updated lead:", out);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
