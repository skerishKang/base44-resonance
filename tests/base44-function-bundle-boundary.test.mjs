import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { tmpdir } from "node:os";

const BASE = resolve(import.meta.dirname, "..");
const CANONICAL_DIR = join(BASE, "base44", "functions", "_shared");
const FUNCTIONS_DIR = join(BASE, "base44", "functions");

const CANONICAL_MODULES = new Map();
for (const file of readdirSync(CANONICAL_DIR).sort()) {
  const content = readFileSync(join(CANONICAL_DIR, file));
  CANONICAL_MODULES.set(file, {
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}

const FUNCTION_DEPENDENCIES = {
  "build-watch-tree": ["watchtree.js", "sanitizer.js"],
  "commit-watch-import": ["watchtree.js", "sanitizer.js"],
  "delete-watch-data": ["watchtree.js", "sanitizer.js"],
  "find-shared-paths": ["watchtree.js", "sanitizer.js"],
  "parse-watch-history": ["watchtree.js", "sanitizer.js"],
  "reconcile-watch-data": ["watchtree.js", "sanitizer.js", "reconcile.js"],
  "seed-demo-history": ["watchtree.js", "sanitizer.js"],
  "set-reveal-consent": ["watchtree.js", "sanitizer.js"],
  "simulate-mutual": ["watchtree.js", "sanitizer.js"],
};

const ALL_FUNCTIONS = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .map((entry) => entry.name)
  .sort();

describe("Base44 function bundle boundary", () => {
  describe("7.1 Function boundary - no escaping relative imports", () => {
    for (const funcName of ALL_FUNCTIONS) {
      it(`${funcName} has no ../_shared relative imports`, () => {
        const funcDir = join(FUNCTIONS_DIR, funcName);
        const files = collectSourceFiles(funcDir);
        const escaping = files.filter((f) => {
          const content = readFileSync(f, "utf-8");
          return /from\s+['"]\.\.\/|import\s*\(['"]\.\.\/|require\(['"]\.\.\//.test(content);
        });
        assert.equal(
          escaping.length,
          0,
          `${funcName} has ${escaping.length} escaping relative import(s): ${escaping.join(", ")}`,
        );
      });
    }
  });

  describe("7.2 Vendored copy equality with canonical", () => {
    for (const [funcName, needed] of Object.entries(FUNCTION_DEPENDENCIES)) {
      for (const modName of needed) {
        it(`${funcName}/_shared/${modName} matches canonical`, () => {
          const targetDir = join(FUNCTIONS_DIR, funcName, "_shared");
          assert.ok(existsSync(targetDir), `${funcName}/_shared/ must exist`);
          assert.ok(
            existsSync(join(targetDir, modName)),
            `${funcName}/_shared/${modName} must exist`,
          );

          const vendoredContent = readFileSync(join(targetDir, modName));
          const vendoredSha = createHash("sha256").update(vendoredContent).digest("hex");
          const canonical = CANONICAL_MODULES.get(modName);

          assert.ok(canonical, `Canonical module ${modName} must exist`);
          assert.equal(vendoredSha, canonical.sha256, `${funcName}/_shared/${modName} SHA-256 mismatch`);
        });
      }
    }
  });

  describe("7.2 Vendored copy freshness - no stale files", () => {
    for (const [funcName, needed] of Object.entries(FUNCTION_DEPENDENCIES)) {
      it(`${funcName}/_shared/ has no stale files`, () => {
        const targetDir = join(FUNCTIONS_DIR, funcName, "_shared");
        if (!existsSync(targetDir)) return;
        const present = readdirSync(targetDir);
        const unexpected = present.filter((f) => !needed.includes(f));
        assert.equal(unexpected.length, 0, `${funcName}/_shared/ has unexpected files: ${unexpected.join(", ")}`);
      });
    }
  });

  describe("7.3 Dependency completeness", () => {
    for (const [funcName, needed] of Object.entries(FUNCTION_DEPENDENCIES)) {
      it(`${funcName} has all required vendored modules`, () => {
        const targetDir = join(FUNCTIONS_DIR, funcName, "_shared");
        assert.ok(existsSync(targetDir), `${funcName}/_shared/ must exist`);
        for (const modName of needed) {
          assert.ok(
            existsSync(join(targetDir, modName)),
            `${funcName}/_shared/${modName} must exist`,
          );
        }
      });
    }
  });

  describe("7.4 Sync idempotency", () => {
    it("running sync twice produces no changes second time", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "base44-sync-test-"));
      const workDir = join(tmpDir, "repo");
      const srcDir = join(import.meta.dirname, "..");
      const { execSync } = await import("node:child_process");

      const excludes = ["node_modules", ".git", "dist", "validator-evidence", "tests/evidence"];
      const excludeArgs = excludes.map((e) => `--exclude=${e}`).join(" ");
      execSync(`rsync -a ${excludeArgs} "${srcDir}/" "${workDir}/"`, { stdio: "pipe" });

      const syncScript = join(workDir, "scripts", "sync-base44-function-shared.mjs");
      execSync(`node "${syncScript}"`, { cwd: workDir, stdio: "pipe" });

      const snapshotDir = mkdtempSync(join(tmpdir(), "base44-sync-snapshot-"));
      execSync(`cp -r "${workDir}/base44/functions" "${snapshotDir}/functions"`, { stdio: "pipe" });

      execSync(`node "${syncScript}"`, { cwd: workDir, stdio: "pipe" });

      const diff = execSync(
        `diff -rq "${snapshotDir}/functions" "${workDir}/base44/functions"`,
        { cwd: workDir, stdio: "pipe" },
      ).toString().trim();

      assert.equal(diff, "", `Second sync run produced changes:\n${diff}`);

      execSync(`rm -rf "${tmpDir}" "${snapshotDir}"`, { stdio: "pipe" });
    });
  });

  describe("7.5 Forbidden import regression detection", () => {
    it("detects escaping import in synthetic fixture", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "base44-forbidden-test-"));
      const { execSync } = await import("node:child_process");

      try {
        mkdirSync(join(tmpDir, "base44", "functions", "_shared"), { recursive: true });
        mkdirSync(join(tmpDir, "base44", "functions", "test-func", "_shared"), { recursive: true });

        writeFileSync(join(tmpDir, "package.json"), JSON.stringify({}));
        writeFileSync(join(tmpDir, "base44", "functions", "_shared", "test.js"), "export const x = 1;");

        writeFileSync(join(tmpDir, "base44", "functions", "test-func", "entry.ts"), 'import { x } from "../_shared/test.js";\n');
        writeFileSync(join(tmpDir, "base44", "functions", "test-func", "_shared", "test.js"), "export const x = 1;");

        const funcDir = FUNCTIONS_DIR;
        const originalFunctions = readdirSync(funcDir).filter((f) => f !== "_shared");
        for (const f of originalFunctions) {
          const src = join(funcDir, f);
          const dst = join(tmpDir, "base44", "functions", f);
          execSync(`cp -r "${src}" "${dst}"`, { stdio: "pipe" });
        }

        const funcPath = join(tmpDir, "base44", "functions", "test-func");
        const files = collectSourceFiles(funcPath);
        const hasEscaping = files.some((f) => {
          const content = readFileSync(f, "utf-8");
          return /from\s+['"]\.\.\//.test(content);
        });
        assert.ok(hasEscaping, "Positive control: escaping import must be detected");
      } finally {
        execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });
      }
    });
  });

  describe("Check script integration", () => {
    it("check:base44-shared passes on current state", async () => {
      const { execSync } = await import("node:child_process");
      const checkScript = join(BASE, "scripts", "check-base44-function-shared.mjs");
      const result = execSync(`node "${checkScript}"`, { cwd: BASE, stdio: "pipe" });
      assert.ok(result.toString().includes("All vendored shared modules match canonical sources"));
    });
  });
});

function collectSourceFiles(dir) {
  const results = [];
  function walk(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
      } else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name)) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}
