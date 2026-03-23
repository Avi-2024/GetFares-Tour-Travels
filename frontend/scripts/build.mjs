import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function resolveScript(relativePathOptions) {
  for (const relativePath of relativePathOptions) {
    const fullPath = path.join(process.cwd(), "node_modules", ...relativePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  throw new Error(`Unable to find build dependency script: ${relativePathOptions.map((parts) => parts.join("/")).join(", ")}`);
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

const tscScript = resolveScript([["typescript", "bin", "tsc"]]);
const viteScript = resolveScript([
  ["vite", "bin", "vite.js"],
  ["vite", "bin", "vite.mjs"],
]);

runNodeScript(tscScript, ["-b"]);
runNodeScript(viteScript, ["build"]);
