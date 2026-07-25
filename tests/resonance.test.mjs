import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LANGUAGE_STORAGE_KEY,
  getCopy,
  getStoredLanguage,
  persistLanguage,
} from "../src/lib/i18n.js";
import {
  createCapabilityState,
  deriveStatusCards,
  getCapabilityActions,
} from "../src/lib/capability.js";
import { validateProbeInput } from "../base44/functions/verify-capability/validation.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

test("language defaults to English", () => {
  assert.equal(getStoredLanguage(createStorage()), "en");
  assert.match(getCopy("en").hero.title, /feel and remember/i);
});

test("language switch exposes Korean functional copy and persists selection", () => {
  const storage = createStorage();
  assert.equal(persistLanguage("ko", storage), "ko");
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), "ko");
  assert.equal(getStoredLanguage(storage), "ko");
  assert.equal(getCopy("ko").auth.submitSignIn, "안전하게 계속");
  assert.equal(getCopy("ko").capability.verify, "Function으로 검증");
});

test("unauthenticated landing exposes no capability actions", () => {
  assert.deepEqual(getCapabilityActions(null), []);
  assert.deepEqual(getCapabilityActions(undefined), []);
  assert.ok(getCapabilityActions({ id: "user-1" }).includes("verify-probe"));
});

test("capability status keeps Auth, Entity, and Function independent", () => {
  const state = createCapabilityState("ready");
  state.entity = "empty";
  state.function = "error";
  const labels = getCopy("en").status;
  const cards = deriveStatusCards(state, labels);
  assert.deepEqual(cards.map((card) => card.key), ["auth", "entity", "function"]);
  assert.deepEqual(cards.map((card) => card.state), ["ready", "empty", "error"]);
});

test("authentication source never logs or surfaces raw error messages", () => {
  const source = read("src/components/AuthPanel.jsx");
  assert.doesNotMatch(source, /console\./);
  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /setMessage\([^\n]*password/i);
});

test("function validation rejects missing and oversized probe IDs", () => {
  assert.deepEqual(validateProbeInput({}), { ok: false, code: "INVALID_PROBE_ID" });
  assert.deepEqual(validateProbeInput({ probe_id: "x".repeat(129) }), { ok: false, code: "INVALID_PROBE_ID" });
  assert.deepEqual(validateProbeInput({ probe_id: "not allowed" }), { ok: false, code: "INVALID_PROBE_ID" });
  assert.deepEqual(validateProbeInput({ probe_id: "probe_123", locale: "fr" }), { ok: false, code: "INVALID_LOCALE" });
  assert.deepEqual(validateProbeInput({ probe_id: "probe_123", locale: "ko" }), { ok: true, probeId: "probe_123", locale: "ko" });
});

test("function source performs explicit authentication and caller-scoped entity access", () => {
  const source = read("base44/functions/verify-capability/entry.ts");
  assert.match(source, /createClientFromRequest\(req\)/);
  assert.match(source, /await base44\.auth\.me\(\)/);
  assert.match(source, /AUTH_REQUIRED/);
  assert.match(source, /base44\.entities\.CapabilityProbe\.get/);
  assert.match(source, /base44\.entities\.CapabilityProbe\.update/);
  assert.doesNotMatch(source, /asServiceRole/);
});

test("CapabilityProbe schema is authenticated-create and owner-only", () => {
  const schema = read("base44/entities/capability-probe.jsonc");
  assert.match(schema, /"create": \{ "user_condition": \{ "id": "\{\{user\.id\}\}" \} \}/);
  assert.match(schema, /"read": \{ "created_by": "\{\{user\.email\}\}" \}/);
  assert.match(schema, /"update": \{ "created_by": "\{\{user\.email\}\}" \}/);
  assert.match(schema, /"delete": \{ "created_by": "\{\{user\.email\}\}" \}/);
  assert.doesNotMatch(schema, /"read"\s*:\s*true/);
});

test("generic Task UI is removed", () => {
  const app = read("src/App.jsx");
  assert.doesNotMatch(app, /Base44 Tasks|What needs to be done|Clear completed/);
  assert.doesNotMatch(app, /entities\.Task/);
});

test("reduced-motion path exists", () => {
  const css = read("src/index.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration: 0\.001ms !important/);
});

test("primary composition avoids fixed desktop width and horizontal overflow", () => {
  const css = read("src/index.css");
  assert.doesNotMatch(css, /width:\s*1440px|min-width:\s*(1200|1440)px/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /width:\s*min\(100% - 2rem, 1180px\)/);
});

test("CI is credential-free and never deploys", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /base44 deploy|secrets\./i);
});
