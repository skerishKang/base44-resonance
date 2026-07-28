import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  verifyReleaseBundle,
  PRODUCTION_APP_ID,
  FORBIDDEN_BUNDLE_STRINGS,
} from "../scripts/verify-release-bundle.mjs";

function createFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-bundle-fixture-"));
  fs.mkdirSync(path.join(dir, "assets"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, "utf-8");
  }
  return dir;
}

function removeFixture(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test("release bundle verification passes for a clean production bundle", () => {
  const dir = createFixture({
    "assets/index-abc123.js": `const appId="${PRODUCTION_APP_ID}";console.log(appId);`,
    "index.html": "<html><body>watchtree</body></html>",
  });
  try {
    const result = verifyReleaseBundle(dir);
    assert.equal(result.ok, true);
    assert.equal(result.expectedAppIdFound, true);
    assert.deepEqual(result.violations, []);
    assert.ok(result.scannedFiles >= 2);
  } finally {
    removeFixture(dir);
  }
});

test("release bundle verification fails when the production App ID is absent", () => {
  const dir = createFixture({
    "assets/index-abc123.js": 'const appId="";console.log("APP_ID_UNAVAILABLE");',
  });
  try {
    const result = verifyReleaseBundle(dir);
    assert.equal(result.ok, false);
    assert.equal(result.expectedAppIdFound, false);
    assert.ok(result.violations.some((violation) => violation.label === "expected production App ID absent"));
  } finally {
    removeFixture(dir);
  }
});

test("release bundle verification rejects validation/buildoff IDs, localhost, and jsxDEV", () => {
  for (const entry of FORBIDDEN_BUNDLE_STRINGS) {
    const dir = createFixture({
      "assets/index-abc123.js": `const appId="${PRODUCTION_APP_ID}";const leak="${entry.value}";`,
    });
    try {
      const result = verifyReleaseBundle(dir);
      assert.equal(result.ok, false, `${entry.label} should fail verification`);
      assert.ok(result.violations.some((violation) => violation.value === entry.value));
    } finally {
      removeFixture(dir);
    }
  }
});

test("release bundle verification fails closed when dist is missing or empty", () => {
  const missing = verifyReleaseBundle(path.join(os.tmpdir(), "release-bundle-does-not-exist"));
  assert.equal(missing.ok, false);
  assert.equal(missing.scannedFiles, 0);

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-bundle-empty-"));
  try {
    const empty = verifyReleaseBundle(emptyDir);
    assert.equal(empty.ok, false);
    assert.equal(empty.scannedFiles, 0);
  } finally {
    removeFixture(emptyDir);
  }
});
