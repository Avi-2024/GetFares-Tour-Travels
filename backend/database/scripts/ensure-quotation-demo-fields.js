/**
 * Fills missing display fields on a quotation row (MySQL).
 * Env: QUOTATION_ID (default: a6a0866b-f8da-491d-95a7-71338aeed8db)
 */
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const DEFAULT_ID = "a6a0866b-f8da-491d-95a7-71338aeed8db";

async function main() {
  const id = String(process.env.QUOTATION_ID || "").trim() || DEFAULT_ID;

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "travel_crm",
  });

  const [rows] = await pool.query(
    "SELECT quotation_title, trip_destination FROM quotations WHERE id = ?",
    [id],
  );
  if (!rows.length) {
    console.error("Quotation not found:", id);
    process.exit(1);
  }

  const title = rows[0].quotation_title || "Demo: Bali 5N/6D";
  const dest = rows[0].trip_destination || "Bali, Indonesia";

  await pool.query(
    `UPDATE quotations
     SET quotation_title = COALESCE(NULLIF(TRIM(quotation_title), ''), ?),
         trip_destination = COALESCE(NULLIF(TRIM(trip_destination), ''), ?),
         duration_nights = COALESCE(duration_nights, 5),
         duration_days = COALESCE(duration_days, 6)
     WHERE id = ?`,
    [title, dest, id],
  );

  console.log(JSON.stringify({ ok: true, id, quotation_title: title, trip_destination: dest }, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
