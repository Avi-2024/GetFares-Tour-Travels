/** Shared checks for MySQL and Azure SQL / MSSQL adapters. */

export function isRelationalAdapter(db) {
  const a = String(db?.adapter || "").toLowerCase();
  return a === "mysql" || a === "mssql";
}

/** Raw SQL via db.query (MySQL- or T-SQL-shaped strings depending on adapter). */
export function supportsRawSql(db) {
  return typeof db?.query === "function" && isRelationalAdapter(db);
}

/** MySQL-only features (GET_LOCK, information_schema + DATABASE(), etc.). */
export function isMysqlAdapter(db) {
  return String(db?.adapter || "").toLowerCase() === "mysql";
}
