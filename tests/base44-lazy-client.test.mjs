import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

const clientSource = read("src/api/base44Client.js");
const appSource = read("src/App.jsx");
const authPanelSource = read("src/components/AuthPanel.jsx");
const capabilitySource = read("src/components/CapabilityPanel.jsx");
const journeySource = read("src/components/ResonanceJourney.jsx");
const productionAdapterSource = read("src/watchtree/productionAdapter.js");

test("Base44 client removes global transport patches and fake auth responses", () => {
  assert.doesNotMatch(clientSource, /XMLHttpRequest/);
  assert.doesNotMatch(clientSource, /onreadystatechange/);
  assert.doesNotMatch(clientSource, /responseText/);
  assert.doesNotMatch(clientSource, /_isAuthMe/);
  assert.doesNotMatch(clientSource, /\/entities\/User\/me/);
  assert.doesNotMatch(clientSource, /JSON\.stringify\(\{[\s\S]*?ok:\s*true/);
});

test("Base44 SDK is loaded lazily through dynamic import only", () => {
  assert.doesNotMatch(clientSource, /import\s+\{[^}]*\}\s+from\s+"@base44\/sdk"/);
  assert.match(clientSource, /import\("@base44\/sdk"\)/);
  assert.match(clientSource, /export function hasStoredBase44Session\(\)/);
  assert.match(clientSource, /export function getBase44Client\(\)/);
  assert.match(clientSource, /export function cleanupBase44Client\(\)/);
  assert.match(clientSource, /createNoopClient\(\)/);
});

test("analytics is disabled through the official SDK URL parameter before SDK load", () => {
  assert.match(clientSource, /ANALYTICS_ENABLE_URL_PARAM = "analytics-enable"/);
  assert.match(clientSource, /params\.set\(ANALYTICS_ENABLE_URL_PARAM, "false"\)/);
  assert.match(clientSource, /disableAnalyticsBeforeSdkLoad\(\);\s*sdkPromise = import\("@base44\/sdk"\)/);
});

test("product modules acquire the client through lazy helpers instead of a static singleton", () => {
  const sources = [appSource, authPanelSource, capabilitySource, journeySource, productionAdapterSource];
  for (const source of sources) {
    assert.doesNotMatch(source, /import\s+\{\s*base44\s*\}\s+from\s+"@\/api\/base44Client"/);
  }
  assert.match(appSource, /import \{ cleanupBase44Client, getBase44Client, hasStoredBase44Session \} from "@\/api\/base44Client"/);
  assert.match(authPanelSource, /import \{ getBase44Client \} from "@\/api\/base44Client"/);
  assert.match(capabilitySource, /import \{ getBase44Client \} from "@\/api\/base44Client"/);
  assert.match(journeySource, /import \{ getBase44Client \} from "@\/api\/base44Client"/);
  assert.match(productionAdapterSource, /import \{ getBase44Client \} from "@\/api\/base44Client"/);
});

test("production adapter keeps transport contracts while using the lazy client", () => {
  assert.doesNotMatch(productionAdapterSource, /localStorage|URLSearchParams/i);
  assert.match(productionAdapterSource, /const base44 = await getBase44Client\(\);\s*let lastError;/);
  assert.match(productionAdapterSource, /const base44 = await getBase44Client\(\);\s*const imports = await base44\.entities\.WatchImport\.list/);
});
