import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.resolve(__dirname, "../database/migrations/database.sql");
const targetPath = path.resolve(
  __dirname,
  "../database/migrations/001_initial.mysql.sql",
);

function transformSchema(sql) {
  let out = sql;
  const enumTypeMap = new Map();

  // Remove PostgreSQL extension statements.
  out = out.replace(/^.*CREATE EXTENSION IF NOT EXISTS.*$/gim, "-- removed: CREATE EXTENSION");

  // Collect PostgreSQL enum types and remove CREATE TYPE statements.
  out = out.replace(
    /CREATE\s+TYPE\s+([A-Za-z_][A-Za-z0-9_]*)\s+AS\s+ENUM\s*\(([\s\S]*?)\)\s*;/gi,
    (_match, typeName, enumValues) => {
      const normalizedType = String(typeName || "").trim();
      const normalizedValues = String(enumValues || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .join(", ");
      if (normalizedType && normalizedValues) {
        enumTypeMap.set(normalizedType, `ENUM(${normalizedValues})`);
      }
      return `-- removed enum type ${normalizedType}`;
    },
  );

  // Core types.
  out = out.replace(/\bJSONB\b/g, "JSON");
  out = out.replace(/\bTIMESTAMPTZ\b/g, "DATETIME");
  out = out.replace(/\bBOOLEAN\b/g, "TINYINT(1)");
  out = out.replace(/\bUUID\b/g, "CHAR(36)");
  out = out.replace(/\bSERIAL\b/g, "BIGINT AUTO_INCREMENT");
  out = out.replace(/gen_random_uuid\(\)/g, "UUID()");
  out = out.replace(/DEFAULT\s+UUID\(\)/gi, "DEFAULT (UUID())");
  out = out.replace(/\b[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?\[\]/gi, "JSON");

  // Replace enum type usage inside column definitions.
  for (const [typeName, enumDefinition] of enumTypeMap.entries()) {
    const typeUsage = new RegExp(
      `(^\\s*[\\\`"]?[A-Za-z_][A-Za-z0-9_]*[\\\`"]?\\s+)${typeName}(\\b)`,
      "gim",
    );
    out = out.replace(typeUsage, `$1${enumDefinition}`);
  }

  // Postgres casts.
  out = out.replace(/::\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\([^)]*\))?/g, "");
  out = out.replace(/'{}'\s*::\s*jsonb/g, "JSON_OBJECT()");
  out = out.replace(/\bjsonb_build_object\s*\(/gi, "JSON_OBJECT(");

  // Time zone + PG-specific functions in DDL defaults.
  out = out.replace(/\bNOW\(\)\b/g, "CURRENT_TIMESTAMP");
  out = out.replace(/DATE_TRUNC\s*\([^)]*\)/gi, "CURRENT_TIMESTAMP");

  // Identifier quoting.
  out = out.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, "`$1`");

  // ON CONFLICT in seed-like statements.
  out = out.replace(/\bINSERT INTO\b/gi, "INSERT IGNORE INTO");
  out = out.replace(/\bON\s+CONFLICT\b[\s\S]*?DO\s+NOTHING\s*;?/gi, ";");

  // Default booleans.
  out = out.replace(/\bDEFAULT\s+TRUE\b/gi, "DEFAULT 1");
  out = out.replace(/\bDEFAULT\s+FALSE\b/gi, "DEFAULT 0");

  // Partial indexes are not supported in MySQL.
  const lines = out.split(/\r?\n/);
  const rewritten = [];
  let pendingIndexStatement = [];

  function flushIndexStatement() {
    if (!pendingIndexStatement.length) {
      return;
    }

    const statement = pendingIndexStatement.join("\n");
    const nameMatch = statement.match(
      /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z0-9_]+)/i,
    );
    const indexName = nameMatch?.[1] || "unknown_index";
    const isPartial = /\bWHERE\b/i.test(statement);

    if (isPartial) {
      rewritten.push(`-- removed partial index: ${indexName}`);
    } else {
      rewritten.push(
        statement
          .replace(/\bCREATE UNIQUE INDEX IF NOT EXISTS\b/gi, "CREATE UNIQUE INDEX")
          .replace(/\bCREATE INDEX IF NOT EXISTS\b/gi, "CREATE INDEX"),
      );
    }

    pendingIndexStatement = [];
  }

  for (const line of lines) {
    if (!pendingIndexStatement.length) {
      if (/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(line)) {
        pendingIndexStatement = [line];
        if (line.includes(";")) {
          flushIndexStatement();
        }
      } else {
        rewritten.push(line);
      }
      continue;
    }

    pendingIndexStatement.push(line);
    if (line.includes(";")) {
      flushIndexStatement();
    }
  }

  flushIndexStatement();
  out = rewritten.join("\n");

  // Replace unsupported postgres table_schema filters if present in schema scripts.
  out = out.replace(/table_schema\s*=\s*'public'/gi, "table_schema = DATABASE()");
  out = out.replace(/\bADD COLUMN IF NOT EXISTS\b/gi, "ADD COLUMN");

  const header = [
    "-- AUTO-GENERATED MYSQL SCHEMA",
    "-- Source: backend/database/migrations/database.sql",
    "-- IMPORTANT: Review manually before production use.",
    "",
  ].join("\n");

  return `${header}\n${out}`;
}

async function main() {
  const sourceSql = await fs.readFile(sourcePath, "utf8");
  const transformed = transformSchema(sourceSql);
  await fs.writeFile(targetPath, transformed, "utf8");
  console.log(`MySQL schema generated: ${targetPath}`);
}

main().catch((error) => {
  console.error("Failed to generate MySQL schema:", error.message);
  process.exitCode = 1;
});
