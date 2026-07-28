import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = resolve(import.meta.dirname, "..");
const CANONICAL_DIR = join(BASE, "base44", "functions", "_shared");
const FUNCTIONS_DIR = join(BASE, "base44", "functions");

const canonicalModules = new Map();
for (const file of readdirSync(CANONICAL_DIR)) {
  const content = readFileSync(join(CANONICAL_DIR, file));
  canonicalModules.set(file, {
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}

const functionDependencies = {
  "build-watch-tree": ["watchtree.js", "sanitizer.js"],
  "commit-watch-import": ["watchtree.js", "sanitizer.js"],
  "delete-watch-data": ["watchtree.js", "sanitizer.js"],
  "find-shared-paths": ["watchtree.js", "sanitizer.js", "watchtree-archetypes.js"],
  "parse-watch-history": ["watchtree.js", "sanitizer.js"],
  "reconcile-watch-data": ["watchtree.js", "sanitizer.js", "reconcile.js"],
  "seed-demo-history": ["watchtree.js", "sanitizer.js"],
  "set-reveal-consent": ["watchtree.js", "sanitizer.js"],
  "simulate-mutual": ["watchtree.js", "sanitizer.js"],
  "resolve-youtube-video": ["watchtree.js", "sanitizer.js"],
  "add-watch-url-event": ["watchtree.js", "sanitizer.js"],
};

let errors = 0;

for (const [funcName, needed] of Object.entries(functionDependencies)) {
  const targetDir = join(FUNCTIONS_DIR, funcName, "_shared");

  if (!existsSync(targetDir)) {
    console.error(`ERROR: ${funcName}/_shared/ directory not found`);
    errors++;
    continue;
  }

  const presentFiles = new Set(readdirSync(targetDir));

  for (const modName of needed) {
    const canonical = canonicalModules.get(modName);
    if (!canonical) {
      console.error(`ERROR: canonical module ${modName} not found`);
      errors++;
      continue;
    }

    if (!presentFiles.has(modName)) {
      console.error(`ERROR: ${funcName}/_shared/${modName} is missing`);
      errors++;
      continue;
    }

    const vendoredContent = readFileSync(join(targetDir, modName));
    const vendoredSha = createHash("sha256").update(vendoredContent).digest("hex");

    if (vendoredSha !== canonical.sha256) {
      console.error(`ERROR: ${funcName}/_shared/${modName} differs from canonical`);
      console.error(`  canonical SHA-256: ${canonical.sha256}`);
      console.error(`  vendored  SHA-256: ${vendoredSha}`);
      errors++;
    }
  }

  for (const file of presentFiles) {
    if (!needed.includes(file)) {
      console.error(`ERROR: ${funcName}/_shared/${file} is stale (not in dependency list)`);
      errors++;
    }
  }
}

if (errors) {
  console.error(`\n${errors} vendored shared module error(s) found. Run "npm run sync:base44-shared" to fix.`);
  process.exit(1);
} else {
  console.log("All vendored shared modules match canonical sources.");
}
