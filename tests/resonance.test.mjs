import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  BASE44_LOCAL_SERVER_URL,
  createBase44ClientConfig,
} from "../src/api/base44ClientConfig.js";
import {
  getScrollBehavior,
  scrollElementIntoView,
  scrollToElementById,
} from "../src/lib/scroll.js";
import { validateProbeInput } from "../base44/functions/verify-capability/validation.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

function collectTextFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((entry) => collectTextFiles(join(path, entry)));
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
  const schema = JSON.parse(read("base44/entities/capability-probe.jsonc"));
  assert.deepEqual(schema.rls.create, {
    $or: [
      { user_condition: { role: "user" } },
      { user_condition: { role: "admin" } },
    ],
  });
  assert.notEqual(schema.rls.create, true);
  assert.notDeepEqual(schema.rls.create, { user_condition: { id: "{{user.id}}" } });

  const ownerRule = { created_by_id: "{{user.id}}" };
  assert.deepEqual(schema.rls.read, ownerRule);
  assert.deepEqual(schema.rls.update, ownerRule);
  assert.deepEqual(schema.rls.delete, ownerRule);
  assert.notEqual(schema.rls.read, true);

  const prohibitedFields = ["id", "created_by", "created_by_id", "owner_id", "owner_email"];
  for (const field of prohibitedFields) {
    assert.equal(Object.hasOwn(schema.properties ?? {}, field), false);
    assert.equal((schema.required ?? []).includes(field), false);
  }
});

test("development client configuration prefers the CLI-provided URL", () => {
  const config = createBase44ClientConfig({
    appId: "public-app-id",
    configuredServerUrl: "  http://127.0.0.1:4411  ",
    isDevelopment: true,
  });
  assert.deepEqual(config, {
    appId: "public-app-id",
    serverUrl: "http://127.0.0.1:4411",
  });
  assert.match(read("src/api/base44Client.js"), /import\.meta\.env\.VITE_BASE44_APP_BASE_URL/);
});

test("local fallback is applied only in development", () => {
  const development = createBase44ClientConfig({
    appId: "public-app-id",
    configuredServerUrl: "",
    isDevelopment: true,
  });
  const production = createBase44ClientConfig({
    appId: "public-app-id",
    configuredServerUrl: "",
    isDevelopment: false,
  });
  assert.equal(development.serverUrl, BASE44_LOCAL_SERVER_URL);
  assert.equal(BASE44_LOCAL_SERVER_URL, "http://localhost:4400");
  assert.equal("serverUrl" in production, false);
});

test("production preserves an explicit hosted URL and otherwise omits serverUrl", () => {
  assert.deepEqual(
    createBase44ClientConfig({
      appId: "public-app-id",
      configuredServerUrl: "https://example.base44.app",
      isDevelopment: false,
    }),
    { appId: "public-app-id", serverUrl: "https://example.base44.app" },
  );
  assert.deepEqual(
    createBase44ClientConfig({
      appId: "public-app-id",
      configuredServerUrl: undefined,
      isDevelopment: false,
    }),
    { appId: "public-app-id" },
  );
});

test("Vite development server binds to all interfaces only through config", () => {
  const source = read("vite.config.js");
  assert.match(source, /server:\s*\{[\s\S]*host:\s*"0\.0\.0\.0"/);
  assert.doesNotMatch(read("package.json"), /--host|0\.0\.0\.0/);
});

test("reduced-motion programmatic scrolling uses auto", () => {
  let receivedOptions;
  const element = {
    scrollIntoView(options) { receivedOptions = options; },
  };
  assert.equal(
    scrollElementIntoView(element, {
      block: "center",
      matchMedia: () => ({ matches: true }),
    }),
    true,
  );
  assert.deepEqual(receivedOptions, { behavior: "auto", block: "center" });
  assert.equal(getScrollBehavior(() => ({ matches: true })), "auto");
});

test("normal-motion programmatic scrolling uses smooth", () => {
  let receivedOptions;
  const element = {
    scrollIntoView(options) { receivedOptions = options; },
  };
  assert.equal(
    scrollElementIntoView(element, {
      block: "start",
      matchMedia: () => ({ matches: false }),
    }),
    true,
  );
  assert.deepEqual(receivedOptions, { behavior: "smooth", block: "start" });
  assert.equal(getScrollBehavior(() => ({ matches: false })), "smooth");
});

test("scroll helper is safe without a browser or target element", () => {
  assert.equal(scrollElementIntoView(null), false);
  assert.equal(scrollToElementById("missing"), false);
  assert.equal(getScrollBehavior(null), "auto");
  const app = read("src/App.jsx");
  assert.match(app, /scrollToElementById/);
  assert.doesNotMatch(app, /scrollIntoView|behavior:\s*"smooth"/);
});

test("legacy scaffold resource directories contain only active resources", () => {
  const entityFiles = readdirSync(join(repoRoot, "base44/entities")).sort();
  assert.deepEqual(entityFiles, ["capability-probe.jsonc"]);
  assert.equal(existsSync(join(repoRoot, "base44/agents")), false);
});

test("source, resources, tests, and README contain no scaffold flow references", () => {
  const textExtensions = new Set([".js", ".jsx", ".ts", ".jsonc", ".mjs", ".md"]);
  const files = [
    ...collectTextFiles(join(repoRoot, "src")),
    ...collectTextFiles(join(repoRoot, "base44")),
    ...collectTextFiles(join(repoRoot, "tests")),
    join(repoRoot, "README.md"),
  ].filter((path) => textExtensions.has(extname(path)));
  const forbiddenTerms = [
    ["Ta", "sk"].join(""),
    ["task", "manager"].join("_"),
  ];

  for (const path of files) {
    const source = readFileSync(path, "utf8");
    for (const term of forbiddenTerms) {
      assert.equal(source.includes(term), false, `${path} contains a removed scaffold reference`);
    }
  }
});

test("generic scaffold UI is removed", () => {
  const app = read("src/App.jsx");
  assert.doesNotMatch(app, /What needs to be done|Clear completed/);
});

test("reduced-motion CSS path exists", () => {
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
