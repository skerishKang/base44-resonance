import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const entities = ["watch-import", "watch-event", "watch-tree-fingerprint", "shared-path-candidate", "reveal-consent", "mutual-resonance", "import-chunk-receipt"];
const functions = ["seed-demo-history", "parse-watch-history", "commit-watch-import", "build-watch-tree", "find-shared-paths", "set-reveal-consent", "simulate-mutual", "delete-watch-data"];

test("all WatchTree entities are owner scoped and contain no client owner field", () => {
  for (const name of entities) {
    const schema = JSON.parse(read(`base44/entities/${name}.jsonc`));
    assert.deepEqual(schema.rls.read, { created_by_id: "{{user.id}}" });
    assert.deepEqual(schema.rls.update, { created_by_id: "{{user.id}}" });
    assert.deepEqual(schema.rls.delete, { created_by_id: "{{user.id}}" });
    for (const key of ["owner_id", "owner_email", "created_by_id"]) assert.equal(Object.hasOwn(schema.properties, key), false);
  }
});

test("all Functions authenticate, accept JSON, use nonce, and avoid service role matching", () => {
  for (const name of functions) {
    const entry = read(`base44/functions/${name}/entry.ts`);
    assert.match(entry, /createClientFromRequest/);
    assert.match(entry, /await authenticate\(base44\)/);
    assert.match(entry, /requirePostJson/);
    assert.match(entry, /validNonce/);
    assert.doesNotMatch(entry, /console\.(log|error).*title|Authorization|cookie|email/i);
  }
  const matching = read("base44/functions/find-shared-paths/entry.ts");
  assert.doesNotMatch(matching, /asServiceRole|WatchEvent\.list\([^)]*other|User\.list/);
  assert.match(matching, /orderCandidates/);
  assert.match(read("base44/functions/_shared/watchtree.js"), /SYNTHETIC_CANDIDATES/);
});

test("production entry graph cannot reach test adapter or query-parameter login", () => {
  const entry = [read("src/main.jsx"), read("src/App.jsx"), read("src/watchtree/productionAdapter.js")].join("\n");
  assert.doesNotMatch(entry, /inMemoryWatchTreeAdapter|tests\/harness|URLSearchParams|test[_-]?login|bypass/i);
  assert.match(read("tests/harness/harness.jsx"), /inMemoryWatchTreeAdapter/);
});

test("raw watch history is not persisted or transported", () => {
  const production = [read("src/watchtree/productionAdapter.js"), ...functions.map((name) => read(`base44/functions/${name}/entry.ts`))].join("\n");
  assert.doesNotMatch(production, /raw_html|raw_json|raw_file|arrayBuffer\(|FileReader|UploadFile|UploadPrivateFile|localStorage|indexedDB/i);
  assert.match(read("src/watchtree/watch-history.worker.js"), /file\.arrayBuffer\(\)/);
});

test("approved visual subset is local and provenance is recorded", () => {
  const files = readdirSync(join(root, "public/watchtree"));
  assert.ok(files.length >= 12);
  assert.ok(files.every((file) => file.endsWith(".svg") || file.endsWith(".json")));
  const manifest = JSON.parse(read("public/watchtree/asset-manifest.json"));
  assert.ok(manifest.assets.every((asset) => asset.provenance === "original" && asset.source_package_sha256 === "987cf85dcf117f671d159344a1a687947c6c27b1878afb89ec0656067376510c"));
});

test("CI is credential free, tests/builds, and never deploys", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run test:browser/);
  assert.doesNotMatch(workflow, /base44 deploy|base44 auth push|entities push|functions push|secrets\./i);
});

test("browser harness uses programmatic Vite lifecycle and verifies the port closes", () => {
  const browserHarness = read("tests/browser/run-watchtree.mjs");
  assert.match(browserHarness, /import \{ createServer \} from "vite"/);
  assert.match(browserHarness, /await server\.listen\(\)/);
  assert.match(browserHarness, /await server\.close\(\)/);
  assert.match(browserHarness, /waitForPortClosed/);
  assert.match(browserHarness, /AggregateError/);
  assert.doesNotMatch(browserHarness, /\bspawn\(|SIGKILL|\.unref\(\)/);
});

test("mobile Scene 6 evidence waits for the actual foreground and excludes Scene 1", () => {
  const browserHarness = read("tests/browser/run-watchtree.mjs");
  assert.match(browserHarness, /watchtree-scene\.is-active\[data-scene=\\?"\$\{expected\}\\?"\]/);
  assert.match(browserHarness, /outgoingSceneOneVisible/);
  assert.match(browserHarness, /shared_leaves/);
  assert.match(browserHarness, /shared_path/);
  assert.match(browserHarness, /rendered_bounds/);
  assert.match(browserHarness, /scrollIntoView\(\{ block: "center"/);
});

test("import commit verifies confirmation, resumes chunks, and suppresses post-write retry duplicates", () => {
  const entry = read("base44/functions/commit-watch-import/entry.ts");
  assert.match(entry, /expectedConfirmationToken/);
  assert.match(entry, /ImportChunkReceipt\.filter/);
  assert.match(entry, /existingSignatures/);
  assert.match(entry, /existing_complete/);
  assert.match(entry, /NONCE_CONFLICT/);
  assert.match(entry, /CHUNK_CONFLICT/);
});

test("privacy exclusion remains authoritative when matching is toggled", () => {
  const entry = read("base44/functions/delete-watch-data/entry.ts");
  assert.match(entry, /event\.sensitivity_excluded\?\{matching_enabled:false\}/);
  assert.match(entry, /sensitivity_excluded:true/);
  assert.match(entry, /clearDerived/);
});

test("reveal consent is nonce-idempotent and synthetic mutual is explicitly labelled", () => {
  const consent = read("base44/functions/set-reveal-consent/entry.ts");
  const mutual = read("base44/functions/simulate-mutual/entry.ts");
  assert.match(consent, /client_nonce/);
  assert.match(consent, /NONCE_CONFLICT/);
  assert.match(consent, /selected_evidence_tokens/);
  assert.match(mutual, /Competition simulation · no real person/);
  assert.match(mutual, /SIMULATION_ONLY/);
});
