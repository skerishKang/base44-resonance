import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

const strictModeSafeLifecycle = /useEffect\(\(\) => \{\s*activeRef\.current = true;\s*return \(\) => \{\s*activeRef\.current = false;\s*\};\s*\}, \[\]\);/;

test("AuthPanel restores the mounted ref during every effect setup", () => {
  const source = read("src/components/AuthPanel.jsx");
  assert.match(source, strictModeSafeLifecycle);
  assert.doesNotMatch(source, /useEffect\(\(\) => \(\) => \{\s*activeRef\.current = false;/);
});

test("AuthPanel cleanup is the only lifecycle path that marks the ref inactive", () => {
  const source = read("src/components/AuthPanel.jsx");
  const assignments = source.match(/activeRef\.current = (true|false);/g) ?? [];
  assert.deepEqual(assignments, [
    "activeRef.current = true;",
    "activeRef.current = false;",
  ]);
});

test("register completion can transition to OTP verification after StrictMode replay", () => {
  const source = read("src/components/AuthPanel.jsx");
  assert.match(
    source,
    /await base44\.auth\.register\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?setPendingEmail\([\s\S]*?setMode\("verify"\);[\s\S]*?setStatus\("success"\);/,
  );
  assert.match(source, /mode !== "verify"[\s\S]*?copy\.auth\.otp/);
});

test("sign-in and OTP completion paths remain mounted-guarded and reachable", () => {
  const source = read("src/components/AuthPanel.jsx");
  assert.match(
    source,
    /await base44\.auth\.loginViaEmailPassword\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?onAuthenticated\(user\);/,
  );
  assert.match(
    source,
    /await base44\.auth\.verifyOtp\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?setMode\("signin"\);[\s\S]*?setStatus\("success"\);/,
  );
});

test("CapabilityPanel uses the same StrictMode-safe lifecycle for list, create, and verify completions", () => {
  const source = read("src/components/CapabilityPanel.jsx");
  assert.match(source, strictModeSafeLifecycle);
  assert.match(source, /await CapabilityProbe\.list\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?setProbes\(/);
  assert.match(source, /await CapabilityProbe\.create\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?setSelectedId\(/);
  assert.match(source, /await base44\.functions\.invoke\([\s\S]*?if \(!activeRef\.current\) return;[\s\S]*?setStateFor\("function", "ready"\)/);
});

test("React StrictMode remains enabled and CI remains credential-free", () => {
  const main = read("src/main.jsx");
  const workflow = read(".github/workflows/ci.yml");
  assert.match(main, /<React\.StrictMode>[\s\S]*?<App \/>[\s\S]*?<\/React\.StrictMode>/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /base44 deploy|secrets\./i);
});
