import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app.js";

const LEAD_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function formatLeadCode(serialValue) {
  let serial = Number(serialValue);
  if (!Number.isFinite(serial) || serial <= 0) serial = 1;
  let n = Math.floor(serial) - 1;
  const d3 = n % 10;
  n = Math.floor(n / 10);
  const l3 = n % 26;
  n = Math.floor(n / 26);
  const d2 = n % 10;
  n = Math.floor(n / 10);
  const l2 = n % 26;
  n = Math.floor(n / 26);
  const d1 = n % 10;
  n = Math.floor(n / 10);
  const l1 = n % 26;
  return `${LEAD_CODE_ALPHABET[l1]}${d1}${LEAD_CODE_ALPHABET[l2]}${d2}${LEAD_CODE_ALPHABET[l3]}${d3}`;
}

function parseLeadCodeSerial(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;
  const match = /^([A-Z])(\d)([A-Z])(\d)([A-Z])(\d)$/.exec(raw);
  if (!match) return null;
  const l1 = LEAD_CODE_ALPHABET.indexOf(match[1]);
  const d1 = Number(match[2]);
  const l2 = LEAD_CODE_ALPHABET.indexOf(match[3]);
  const d2 = Number(match[4]);
  const l3 = LEAD_CODE_ALPHABET.indexOf(match[5]);
  const d3 = Number(match[6]);
  if (
    l1 < 0 ||
    l2 < 0 ||
    l3 < 0 ||
    !Number.isFinite(d1) ||
    !Number.isFinite(d2) ||
    !Number.isFinite(d3)
  ) {
    return null;
  }
  return (((((l1 * 10 + d1) * 26 + l2) * 10 + d2) * 26 + l3) * 10 + d3) + 1;
}

async function reserveNextLeadCodeSerial(db) {
  try {
    const result = await db.query(`SELECT nextval('leads_lead_code_seq') AS serial`);
    const serial = Number(result?.rows?.[0]?.serial ?? 0);
    if (Number.isFinite(serial) && serial > 0) return serial;
  } catch {
    // ignore
  }

  const res = await db.query(
    `SELECT lead_code FROM leads WHERE lead_code IS NOT NULL ORDER BY created_at DESC LIMIT 500`,
  );
  const rows = Array.isArray(res?.rows) ? res.rows : [];
  let max = 0;
  for (const row of rows) {
    const serial = parseLeadCodeSerial(row?.lead_code ?? row?.leadCode ?? null);
    if (serial && serial > max) max = serial;
  }
  return max + 1;
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function wallClockNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function columnExists(db, table, column) {
  if (typeof db.query !== "function") return false;
  const res = await db.query(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [table, column],
  );
  const count = Number(res?.rows?.[0]?.count ?? res?.rows?.[0]?.COUNT ?? 0);
  return count > 0;
}

async function tableExists(db, table) {
  if (typeof db.query !== "function") return false;
  const res = await db.query(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [table],
  );
  const count = Number(res?.rows?.[0]?.count ?? res?.rows?.[0]?.COUNT ?? 0);
  return count > 0;
}

async function main() {
  const COUNT = envInt("COUNT", 25);
  const START = envInt("START", 1);
  const EMAIL_PREFIX = String(process.env.EMAIL_PREFIX || "new12").trim();

  const appInstance = createApp();
  const { container } = appInstance;
  const db = container.db;

  const hasCustomerId = await columnExists(db, "leads", "customer_id");
  const hasLeadCountry = await columnExists(db, "leads", "lead_country");
  const hasNationality = await columnExists(db, "leads", "nationality");
  const hasClientCurrency = await columnExists(db, "leads", "client_currency");
  const hasAddressLine = await columnExists(db, "leads", "address_line");
  const hasTravelEndDate = await columnExists(db, "leads", "travel_end_date");
  const hasVisaRequired = await columnExists(db, "leads", "visa_required");
  const hasPreferredHotelCategory = await columnExists(
    db,
    "leads",
    "preferred_hotel_category",
  );
  const hasTravelPurpose = await columnExists(db, "leads", "travel_purpose");
  const hasLeadType = await columnExists(db, "leads", "lead_type");
  const hasChildAges = await columnExists(db, "leads", "child_ages");
  const hasClientCreatedAt = await columnExists(db, "leads", "client_created_at");
  const hasClientTimezone = await columnExists(db, "leads", "client_timezone");
  const hasDestinationId = await columnExists(db, "leads", "destination_id");
  const hasTravelTo = await columnExists(db, "leads", "travel_to");
  const hasCustomerLeads = await tableExists(db, "customer_leads");

  let destination = null;
  try {
    const destRes = await db.query(
      `SELECT id, name FROM destinations WHERE COALESCE(is_active, 1) = 1 ORDER BY created_at DESC LIMIT 1`,
    );
    destination = destRes?.rows?.[0] || null;
  } catch {
    destination = null;
  }

  const created = [];
  const createdAtWall = wallClockNow();
  const clientTimezone = String(process.env.CLIENT_TIMEZONE || "Asia/Kolkata");
  let nextLeadSerial = await reserveNextLeadCodeSerial(db);

  for (let i = START; i < START + COUNT; i += 1) {
    const email = `${EMAIL_PREFIX}${i}@gmail.com`;
    const phone = `91747056${String(i).padStart(4, "0")}`.slice(0, 12);
    const firstName = `New${i}`;
    const lastName = `Lead${i}`;
    const fullName = `${firstName} ${lastName}`;

    const customerId = randomUUID();
    await db.query(
      `
        INSERT INTO customers (id, full_name, email, phone, segment, is_deleted)
        VALUES (?, ?, ?, ?, 'NEW', 0)
      `,
      [customerId, fullName, email, phone],
    );

    const leadId = randomUUID();
    const leadCols = ["id", "full_name", "email", "phone", "status", "source"];
    const leadVals = [leadId, fullName, email, phone, "OPEN", "Website"];
    leadCols.push("lead_code");
    leadVals.push(formatLeadCode(nextLeadSerial));
    nextLeadSerial += 1;

    if (hasCustomerId) {
      leadCols.push("customer_id");
      leadVals.push(customerId);
    }
    if (hasLeadCountry) {
      leadCols.push("lead_country");
      leadVals.push("India");
    }
    if (hasNationality) {
      leadCols.push("nationality");
      leadVals.push("Indian");
    }
    if (hasClientCurrency) {
      leadCols.push("client_currency");
      leadVals.push("INR");
    }
    if (hasAddressLine) {
      leadCols.push("address_line");
      leadVals.push("India");
    }
    if (hasTravelTo) {
      leadCols.push("travel_to");
      leadVals.push(destination?.name || "Dubai");
    }
    if (hasDestinationId && destination?.id) {
      leadCols.push("destination_id");
      leadVals.push(destination.id);
    }

    leadCols.push("travel_date");
    leadVals.push("2026-06-01");

    if (hasTravelEndDate) {
      leadCols.push("travel_end_date");
      leadVals.push("2026-06-07");
    }

    leadCols.push("adults_count", "children_count", "budget");
    leadVals.push(2, 0, 0);

    if (hasChildAges) {
      leadCols.push("child_ages");
      leadVals.push(JSON.stringify([]));
    }

    if (hasVisaRequired) {
      leadCols.push("visa_required");
      leadVals.push(0);
    }

    if (hasPreferredHotelCategory) {
      leadCols.push("preferred_hotel_category");
      leadVals.push("ANY");
    }

    if (hasTravelPurpose) {
      leadCols.push("travel_purpose");
      leadVals.push("Tourism");
    }

    if (hasLeadType) {
      leadCols.push("lead_type");
      leadVals.push("HOLIDAY");
    }

    if (hasClientCreatedAt) {
      leadCols.push("client_created_at");
      leadVals.push(createdAtWall);
    }
    if (hasClientTimezone) {
      leadCols.push("client_timezone");
      leadVals.push(clientTimezone);
    }

    const placeholders = leadCols.map(() => "?").join(", ");
    await db.query(
      `INSERT INTO leads (${leadCols.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
      leadVals,
    );

    if (hasCustomerLeads) {
      await db.query(
        `
          INSERT INTO customer_leads (customer_id, lead_id, is_deleted)
          VALUES (?, ?, 0)
          ON DUPLICATE KEY UPDATE is_deleted = 0
        `,
        [customerId, leadId],
      );
    }

    created.push({ leadId, customerId, email });
  }

  console.log(JSON.stringify({ createdCount: created.length, created }, null, 2));

  if (appInstance?.container?.db?.pool) {
    await appInstance.container.db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

