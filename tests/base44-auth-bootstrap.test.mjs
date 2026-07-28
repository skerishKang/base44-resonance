import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

const appSource = read("src/App.jsx");
const authPanelSource = read("src/components/AuthPanel.jsx");
const capabilitySource = read("src/components/CapabilityPanel.jsx");
const journeySource = read("src/components/ResonanceJourney.jsx");

test("anonymous restore does not create a Base44 client when no session token exists", () => {
  assert.match(appSource, /if \(!hasStoredBase44Session\(\)\) \{[\s\S]*?setAuthState\("anonymous"\);[\s\S]*?setAuthNotice\(""\);[\s\S]*?return;/);
  assert.doesNotMatch(appSource, /base44\.auth\.isAuthenticated/);
  assert.match(appSource, /return \(\) => \{ active = false; cleanupBase44Client\(\); \};/);
});

test("stored sessions restore through one lazy client and one official auth.me call", () => {
  assert.match(appSource, /const base44 = await getBase44Client\(\);\s*const currentUser = await base44\.auth\.me\(\);/);
  assert.match(appSource, /setAuthNotice\(""\);\s*if \(currentUser\) \{ setUser\(currentUser\); setAuthState\("ready"\); \}/);
  assert.match(appSource, /if \(status === 401 \|\| status === 403\) setAuthNotice\(""\);/);
});

test("explicit auth actions create the client immediately before official SDK auth calls", () => {
  assert.match(authPanelSource, /const base44 = await getBase44Client\(\);\s*const response = await base44\.auth\.loginViaEmailPassword\(email\.trim\(\), password\);/);
  assert.match(authPanelSource, /const base44 = await getBase44Client\(\);\s*await base44\.auth\.register\(\{ email: email\.trim\(\), password \}\);/);
  assert.match(authPanelSource, /const base44 = await getBase44Client\(\);\s*await base44\.auth\.verifyOtp\(\{ email: pendingEmail, otpCode: otp \}\);/);
});

test("authenticated proof surfaces resolve entities and functions through the lazy client", () => {
  assert.match(capabilitySource, /const base44 = await getBase44Client\(\);\s*const CapabilityProbe = base44\.entities\.CapabilityProbe;\s*const records = await CapabilityProbe\.list/);
  assert.match(capabilitySource, /const base44 = await getBase44Client\(\);\s*const CapabilityProbe = base44\.entities\.CapabilityProbe;\s*const record = await CapabilityProbe\.create/);
  assert.match(capabilitySource, /const base44 = await getBase44Client\(\);\s*const response = await base44\.functions\.invoke\("verify-capability"/);
  assert.match(journeySource, /const \{ MemoryCard, ConsentRecord, ResonanceFingerprint, MatchDecision \} = await getBase44Entities\(\);/);
  assert.match(journeySource, /const base44 = await getBase44Client\(\);\s*const response = await base44\.functions\.invoke\("compute-matches"/);
  assert.match(journeySource, /const base44 = await getBase44Client\(\);\s*const response = await base44\.functions\.invoke\("generate-fingerprint"/);
});
