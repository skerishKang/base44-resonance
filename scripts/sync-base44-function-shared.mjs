import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

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

let changed = 0;
let created = 0;
let removed = 0;

for (const [funcName, needed] of Object.entries(functionDependencies)) {
  const targetDir = join(FUNCTIONS_DIR, funcName, "_shared");
  const existingFiles = new Set(existsSync(targetDir) ? readdirSync(targetDir) : []);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  for (const modName of needed) {
    const canonical = canonicalModules.get(modName);
    if (!canonical) {
      console.error(`ERROR: canonical module ${modName} not found in ${CANONICAL_DIR}`);
      process.exit(1);
    }

    const targetPath = join(targetDir, modName);
    const existingContent = existsSync(targetPath) ? readFileSync(targetPath) : null;

    if (existingContent && Buffer.from(existingContent).equals(canonical.content)) {
      existingFiles.delete(modName);
      continue;
    }

    copyFileSync(join(CANONICAL_DIR, modName), targetPath);
    if (existingContent) {
      changed++;
      console.log(`UPDATED ${funcName}/_shared/${modName}`);
    } else {
      created++;
      console.log(`CREATED ${funcName}/_shared/${modName}`);
    }
    existingFiles.delete(modName);
  }

  for (const staleFile of existingFiles) {
    const stalePath = join(targetDir, staleFile);
    unlinkSync(stalePath);
    removed++;
    console.log(`REMOVED stale ${funcName}/_shared/${staleFile}`);
  }
}

console.log(`\nSync complete: ${created} created, ${changed} updated, ${removed} removed`);
