import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  MEMORY_CARD_SLOTS,
  MEMORY_MAX_LENGTH,
  MEMORY_MIN_LENGTH,
  deriveJourneyStep,
  fingerprintValues,
  isMemoryTextValid,
} from "../src/lib/resonance.js";
import { validateGenerateFingerprintInput } from "../base44/functions/generate-fingerprint/validation.js";
import { buildDeterministicFingerprint } from "../base44/functions/generate-fingerprint/fingerprint.js";
import { validateComputeMatchesInput } from "../base44/functions/compute-matches/validation.js";
import { computeDeterministicMatches } from "../base44/functions/compute-matches/matching.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");
const parse = (path) => JSON.parse(read(path));

const entityPaths = [
  "base44/entities/memory-card.jsonc",
  "base44/entities/consent-record.jsonc",
  "base44/entities/resonance-fingerprint.jsonc",
  "base44/entities/match-decision.jsonc",
];

const authenticatedCreate = {
  $or: [
    { user_condition: { role: "user" } },
    { user_condition: { role: "admin" } },
  ],
};
const ownerRule = { created_by_id: "{{user.id}}" };
const prohibitedOwnerFields = ["id", "created_by", "created_by_id", "owner_id", "owner_email"];

const sampleCards = [
  { slot: "vivid_moment", content: "A quiet platform after rain, with reflected light and patient footsteps." },
  { slot: "care_expression", content: "I tend to remember small details and make practical room for another person." },
  { slot: "conversation_condition", content: "Conversation feels alive when pauses are welcome and curiosity moves both ways." },
];

test("auth errors are not rendered before an explicit panel state and recovery clears stale notice", () => {
  const app = read("src/App.jsx");
  assert.match(app, /authNotice && authPanelOpen/);
  assert.match(app, /setAuthNotice\(""\);[\s\S]*setAuthState\("ready"\)/);
  assert.match(app, /const openAuth = \(\) => \{\s*setAuthNotice\(""\)/);
  assert.doesNotMatch(app, /setAuthNotice\(text\.auth\.errors\.unavailable\)/);
});

test("normal authenticated product UI never renders a raw account email", () => {
  const app = read("src/App.jsx");
  const journey = read("src/components/ResonanceJourney.jsx");
  const capability = read("src/components/CapabilityPanel.jsx");
  assert.doesNotMatch(app, /user\?\.(email|username)|user\.email/);
  assert.doesNotMatch(journey, /user\?\.(email|username)|user\.email/);
  assert.doesNotMatch(capability, /user\?\.(email|username)|user\.email/);
  assert.match(journey, /copy\.journey\.member/);
  assert.match(capability, /copy\.capability\.member/);
});

test("mobile landing keeps a primary CTA in the initial viewport contract", () => {
  const app = read("src/App.jsx");
  const css = read("src/product.css");
  assert.match(app, /data-primary-cta="resonance"/);
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*min-height: calc\(100svh - 66px\)/);
  assert.match(css, /\[data-primary-cta="resonance"\][\s\S]*min-height: 3\.15rem/);
  assert.match(css, /hero__actions \.button--ghost \{ display: none; \}/);
});

test("the product journey exposes exactly three bounded memory-card slots", () => {
  assert.deepEqual(MEMORY_CARD_SLOTS, ["vivid_moment", "care_expression", "conversation_condition"]);
  assert.equal(MEMORY_MIN_LENGTH, 24);
  assert.equal(MEMORY_MAX_LENGTH, 420);
  assert.equal(isMemoryTextValid("x".repeat(23)), false);
  assert.equal(isMemoryTextValid("x".repeat(24)), true);
  assert.equal(isMemoryTextValid("x".repeat(421)), false);
  const journey = read("src/components/ResonanceJourney.jsx");
  assert.match(journey, /MEMORY_CARD_SLOTS\.map/);
  assert.match(journey, /minLength=\{MEMORY_MIN_LENGTH\}/);
  assert.match(journey, /maxLength=\{MEMORY_MAX_LENGTH\}/);
});

test("consent starts unselected and requires an affirmative user action", () => {
  const journey = read("src/components/ResonanceJourney.jsx");
  assert.match(journey, /useState\(false\)/);
  assert.match(journey, /type="checkbox"/);
  assert.match(journey, /checked=\{consentChecked\}/);
  assert.match(journey, /!cardsSaved \|\| !consentChecked/);
  assert.match(journey, /withdrawConsent/);
});

test("all new private Entities use authenticated create and creator-ID owner RLS", () => {
  for (const path of entityPaths) {
    const schema = parse(path);
    assert.deepEqual(schema.rls.create, authenticatedCreate, path);
    assert.notEqual(schema.rls.create, true, path);
    assert.deepEqual(schema.rls.read, ownerRule, path);
    assert.deepEqual(schema.rls.update, ownerRule, path);
    assert.deepEqual(schema.rls.delete, ownerRule, path);
    assert.notEqual(schema.rls.read, true, path);
  }
});

test("new Entity schemas expose no client-controlled owner or built-in identity fields", () => {
  for (const path of entityPaths) {
    const schema = parse(path);
    for (const field of prohibitedOwnerFields) {
      assert.equal(Object.hasOwn(schema.properties ?? {}, field), false, `${path}:${field}`);
      assert.equal((schema.required ?? []).includes(field), false, `${path}:${field}`);
    }
  }
});

test("Entity schemas bound strings, arrays, enums, and the exactly-three relationship", () => {
  const memory = parse(entityPaths[0]);
  const consent = parse(entityPaths[1]);
  const fingerprint = parse(entityPaths[2]);
  const decision = parse(entityPaths[3]);
  assert.equal(memory.properties.content.minLength, 24);
  assert.equal(memory.properties.content.maxLength, 420);
  assert.equal(consent.properties.memory_card_ids.minItems, 3);
  assert.equal(consent.properties.memory_card_ids.maxItems, 3);
  assert.equal(fingerprint.properties.memory_card_ids.maxItems, 3);
  assert.equal(fingerprint.properties.summary.maxLength, 220);
  assert.deepEqual(decision.properties.candidate_id.enum, ["sol", "mira", "jun"]);
  assert.deepEqual(decision.properties.state.enum, ["interested_waiting", "simulated_mutual"]);
});

test("generate-fingerprint validates exactly three unique IDs, consent, and locale", () => {
  assert.deepEqual(validateGenerateFingerprintInput(null), { ok: false, code: "INVALID_INPUT" });
  assert.deepEqual(validateGenerateFingerprintInput({ memory_card_ids: ["a", "a", "b"], consent_record_id: "c" }), { ok: false, code: "INVALID_MEMORY_CARD_IDS" });
  assert.deepEqual(validateGenerateFingerprintInput({ memory_card_ids: ["a", "b", "c"], consent_record_id: "bad id" }), { ok: false, code: "INVALID_CONSENT_RECORD_ID" });
  assert.deepEqual(validateGenerateFingerprintInput({ memory_card_ids: ["a", "b", "c"], consent_record_id: "consent_1", locale: "fr" }), { ok: false, code: "INVALID_LOCALE" });
  assert.deepEqual(validateGenerateFingerprintInput({ memory_card_ids: ["a", "b", "c"], consent_record_id: "consent_1", locale: "ko" }), {
    ok: true,
    memoryCardIds: ["a", "b", "c"],
    consentRecordId: "consent_1",
    locale: "ko",
  });
});

test("generate-fingerprint is POST-only, authenticated, consent-gated, caller-scoped, and bounded", () => {
  const entry = read("base44/functions/generate-fingerprint/entry.ts");
  assert.match(entry, /req\.method !== "POST"/);
  assert.match(entry, /UNSUPPORTED_MEDIA_TYPE/);
  assert.match(entry, /await base44\.auth\.me\(\)/);
  assert.match(entry, /base44\.entities\.ConsentRecord\.get/);
  assert.match(entry, /consent\.active !== true/);
  assert.match(entry, /base44\.entities\.MemoryCard\.get/);
  assert.match(entry, /MEMORY_CARDS_UNAVAILABLE/);
  assert.match(entry, /ResonanceFingerprint\.filter/);
  assert.match(entry, /ResonanceFingerprint\.(update|create)/);
  assert.doesNotMatch(entry, /asServiceRole/);

  const fingerprint = buildDeterministicFingerprint(sampleCards, "en");
  assert.equal(fingerprint.interpretation_version, "deterministic-v1");
  assert.ok(fingerprint.summary.length <= 220);
  assert.equal(fingerprintValues(fingerprint).length, 5);
});

test("compute-matches validates fingerprint input and returns stable synthetic ordering", () => {
  assert.deepEqual(validateComputeMatchesInput({ fingerprint_id: "bad id" }), { ok: false, code: "INVALID_FINGERPRINT_ID" });
  const fingerprint = buildDeterministicFingerprint(sampleCards, "en");
  const first = computeDeterministicMatches(fingerprint, "en");
  const second = computeDeterministicMatches(fingerprint, "en");
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.deepEqual([...first].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)), first);
  assert.deepEqual(new Set(first.map((candidate) => candidate.id)), new Set(["sol", "mira", "jun"]));
  for (const candidate of first) {
    assert.equal(candidate.synthetic_label, "Synthetic demo profile");
    assert.ok(candidate.score >= 58 && candidate.score <= 94);
    assert.ok(candidate.shared_signals.length >= 2 && candidate.shared_signals.length <= 3);
    assert.ok(candidate.difference.length <= 120);
    assert.ok(candidate.explanation.length <= 220);
  }
});

test("compute-matches treats inaccessible and nonexistent fingerprints as one unavailable class", () => {
  const entry = read("base44/functions/compute-matches/entry.ts");
  assert.match(entry, /base44\.entities\.ResonanceFingerprint\.get/);
  assert.equal((entry.match(/FINGERPRINT_UNAVAILABLE/g) ?? []).length, 2);
  assert.match(entry, /await base44\.auth\.me\(\)/);
  assert.doesNotMatch(entry, /asServiceRole/);
});

test("candidate output never copies raw memory text and no live AI, Agent, or Integration path exists", () => {
  const functionFiles = [
    "base44/functions/generate-fingerprint/entry.ts",
    "base44/functions/generate-fingerprint/fingerprint.js",
    "base44/functions/compute-matches/entry.ts",
    "base44/functions/compute-matches/matching.js",
  ].map(read).join("\n");
  assert.doesNotMatch(functionFiles, /InvokeLLM|GenerateImage|integrations\.|base44\.agents|aiGateway|asServiceRole/);
  const matching = read("base44/functions/compute-matches/matching.js");
  assert.doesNotMatch(matching, /\.content|memoryCards/);
});

test("reload restores durable steps and StrictMode guards every mutation from duplication", () => {
  const journey = read("src/components/ResonanceJourney.jsx");
  assert.match(journey, /MemoryCard\.list/);
  assert.match(journey, /ConsentRecord\.list/);
  assert.match(journey, /ResonanceFingerprint\.list/);
  assert.match(journey, /MatchDecision\.list/);
  assert.match(journey, /inFlightRef\.current\.has/);
  assert.match(journey, /beginAction\("generate-fingerprint"\)/);
  assert.match(journey, /beginAction\("match-decision"\)/);
  assert.match(journey, /activeRef\.current = true/);
  assert.match(journey, /activeRef\.current = false/);
  const generateEntry = read("base44/functions/generate-fingerprint/entry.ts");
  assert.match(generateEntry, /existing\?\.\[0\]\?\.id[\s\S]*ResonanceFingerprint\.update[\s\S]*ResonanceFingerprint\.create/);
});

test("mobile product result, reduced motion, and overflow contracts remain explicit", () => {
  const journey = read("src/components/ResonanceJourney.jsx");
  const productCss = read("src/product.css");
  const baseCss = read("src/index.css");
  assert.match(journey, /data-product-result="fingerprint"/);
  assert.match(journey, /data-product-result="candidates"/);
  assert.match(productCss, /@media \(max-width: 620px\)/);
  assert.match(productCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(baseCss, /overflow-x:\s*clip/);
  assert.doesNotMatch(productCss, /min-width:\s*(1200|1440)px|width:\s*1440px/);
});

test("journey step derivation is deterministic and reaches mutual state", () => {
  const cards = Object.fromEntries(MEMORY_CARD_SLOTS.map((slot, index) => [slot, { id: `m${index}`, content: sampleCards[index].content }]));
  assert.equal(deriveJourneyStep({ cards: {}, consent: null, fingerprint: null, candidates: [], decision: null }), "memories");
  assert.equal(deriveJourneyStep({ cards, consent: { active: true }, fingerprint: { id: "f1" }, candidates: [{}, {}, {}], decision: { state: "simulated_mutual" } }), "mutual");
});

test("CI remains credential-free and contains no deploy or Base44 push", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /base44 deploy|base44 auth push|entities push|functions push|secrets\./i);
});

test("the active Entity inventory preserves Slice 2 and adds the WatchTree resources", () => {
  const files = readdirSync(join(repoRoot, "base44/entities")).sort();
  assert.deepEqual(files, [
    "capability-probe.jsonc",
    "consent-record.jsonc",
    "import-chunk-receipt.jsonc",
    "match-decision.jsonc",
    "memory-card.jsonc",
    "mutual-resonance.jsonc",
    "resonance-fingerprint.jsonc",
    "reveal-consent.jsonc",
    "shared-path-candidate.jsonc",
    "watch-event.jsonc",
    "watch-import.jsonc",
    "watch-tree-fingerprint.jsonc",
  ]);
});
