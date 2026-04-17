import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const count = Number(process.argv[2] || 1000);
const outputPath =
  process.argv[3] ||
  path.resolve(__dirname, "auth-load-users.json");
const ts = Date.now();

if (!Number.isInteger(count) || count <= 0) {
  throw new Error("Count must be positive integer");
}

const payloads = Array.from({ length: count }, (_, index) => {
  const serial = String(index + 1).padStart(6, "0");
  return {
    fullName: `Load User ${serial}`,
    email: `load.user.${ts}.${serial}@example.com`,
    phone: `90000${String(index + 1).padStart(5, "0")}`,
    password: "LoadTest@123",
  };
});

fs.writeFileSync(outputPath, JSON.stringify(payloads, null, 2), "utf8");
console.log(`Generated ${payloads.length} users at ${outputPath}`);
