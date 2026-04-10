import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.resolve(ROOT, "docs", "MYSQL_AUDIT_REPORT.md");

const INCLUDE_EXTENSIONS = new Set([".js", ".sql"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build"]);

const RULES = [
  { key: "RETURNING", pattern: /\bRETURNING\b/gi, severity: "high" },
  { key: "TYPE_CAST", pattern: /::\s*[a-z_][a-z0-9_]*(?:\([^)]*\))?/gi, severity: "high" },
  { key: "JSONB", pattern: /\bjsonb\b/gi, severity: "high" },
  { key: "DATE_TRUNC", pattern: /\bDATE_TRUNC\s*\(/gi, severity: "high" },
  { key: "FILTER_WHERE", pattern: /\bFILTER\s*\(\s*WHERE/gi, severity: "high" },
  { key: "ANY_ARRAY", pattern: /\bANY\s*\(/gi, severity: "high" },
  { key: "ADVISORY_LOCK", pattern: /\bpg_(try_)?advisory_lock\b/gi, severity: "high" },
  { key: "ON_CONFLICT", pattern: /\bON\s+CONFLICT\b/gi, severity: "medium" },
  { key: "ILIKE", pattern: /\bILIKE\b/gi, severity: "medium" },
  { key: "INFO_SCHEMA_PUBLIC", pattern: /table_schema\s*=\s*'public'/gi, severity: "medium" },
];

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!INCLUDE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }
  return files;
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

async function main() {
  const files = await walk(ROOT);
  const report = RULES.map((rule) => ({
    ...rule,
    count: 0,
    hits: [],
  }));

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    for (const bucket of report) {
      bucket.pattern.lastIndex = 0;
      let match;
      while ((match = bucket.pattern.exec(content)) !== null) {
        bucket.count += 1;
        if (bucket.hits.length < 150) {
          bucket.hits.push({
            file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
            line: getLineNumber(content, match.index),
            sample: match[0],
          });
        }
      }
    }
  }

  const total = report.reduce((sum, item) => sum + item.count, 0);
  const lines = [];
  lines.push("# MySQL Compatibility Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Scope: ${ROOT}`);
  lines.push(`Total findings: ${total}`);
  lines.push("");

  for (const item of report) {
    lines.push(`## ${item.key}`);
    lines.push("");
    lines.push(`- Severity: ${item.severity}`);
    lines.push(`- Count: ${item.count}`);
    lines.push("");
    if (!item.hits.length) {
      lines.push("No occurrences.");
      lines.push("");
      continue;
    }
    lines.push("| File | Line | Sample |");
    lines.push("|---|---:|---|");
    for (const hit of item.hits) {
      const sample = String(hit.sample).replace(/\|/g, "\\|");
      lines.push(`| ${hit.file} | ${hit.line} | \`${sample}\` |`);
    }
    if (item.count > item.hits.length) {
      lines.push(`| ... | ... | ... and ${item.count - item.hits.length} more |`);
    }
    lines.push("");
  }

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
  console.log(`MySQL audit report generated: ${OUTPUT}`);
}

main().catch((error) => {
  console.error("MySQL audit failed:", error.message);
  process.exitCode = 1;
});
