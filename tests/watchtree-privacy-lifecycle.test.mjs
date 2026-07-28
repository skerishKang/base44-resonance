import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createMockBase44Store } from "./harness/mockBase44Store.js";
import {
  clearDerivedRecords,
  deleteAllRecords,
  deleteImportRecords,
  drainRecords,
  listAllRecords,
} from "../base44/functions/_shared/watchtree.js";
import { reconcileOrphans } from "../base44/functions/_shared/reconcile.js";
import { scopeRestoredMatching } from "../src/watchtree/matching.js";
import { initialState, watchTreeReducer } from "../src/watchtree/state-machine.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

async function seedImport(store, index, options = {}) {
  const {
    events = 0,
    signals = 0,
    receipts = 0,
    trees = 1,
    candidatesPerTree = 1,
    consentsPerCandidate = 1,
    mutualsPerCandidate = 1,
  } = options;
  const watchImport = await store.entities.WatchImport.create({
    id: `imp_${index}`,
    status: "completed",
    matching_enabled: true,
    created_date: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
  });
  await Promise.all(Array.from({ length: events }, (_, i) => store.entities.WatchEvent.create({
    import_id: watchImport.id,
    watched_at: `2026-03-01T${String(i % 24).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}.000Z`,
    sensitivity_excluded: false,
    matching_enabled: true,
  })));
  await Promise.all(Array.from({ length: signals }, (_, i) => store.entities.WatchMatchSignal.create({
    import_id: watchImport.id,
    match_key: `mk_${index}_${i}`,
  })));
  await Promise.all(Array.from({ length: receipts }, (_, i) => store.entities.ImportChunkReceipt.create({
    import_id: watchImport.id,
    chunk_index: i,
    status: "committed",
  })));
  for (let t = 0; t < trees; t += 1) {
    const tree = await store.entities.WatchTreeFingerprint.create({
      id: `tree_${index}_${t}`,
      import_id: watchImport.id,
      stale: false,
    });
    for (let c = 0; c < candidatesPerTree; c += 1) {
      const candidate = await store.entities.SharedPathCandidate.create({
        id: `cand_${index}_${t}_${c}`,
        fingerprint_id: tree.id,
        candidate_rank: c,
      });
      await Promise.all(Array.from({ length: consentsPerCandidate }, (_, i) => store.entities.RevealConsent.create({
        candidate_id: candidate.id,
        state: "granted",
        consent_ordinal: i,
      })));
      await Promise.all(Array.from({ length: mutualsPerCandidate }, (_, i) => store.entities.MutualResonance.create({
        candidate_id: candidate.id,
        state: "mutual",
        mutual_ordinal: i,
      })));
    }
  }
  return watchImport;
}

const TABLES = ["WatchImport", "WatchEvent", "WatchTreeFingerprint", "SharedPathCandidate", "RevealConsent", "MutualResonance", "ImportChunkReceipt", "WatchMatchSignal"];
const totalRemaining = (store) => TABLES.reduce((sum, name) => sum + store.count(name), 0);

test("delete_all removes 21 imports with 21+ derived records at every level", async () => {
  const store = createMockBase44Store();
  for (let i = 0; i < 21; i += 1) {
    await seedImport(store, i, { events: 3, signals: 2, receipts: 2, trees: 2, candidatesPerTree: 3, consentsPerCandidate: 2, mutualsPerCandidate: 2 });
  }
  assert.equal(store.count("WatchImport"), 21);
  assert.equal(store.count("WatchTreeFingerprint"), 42);
  assert.equal(store.count("SharedPathCandidate"), 126);
  assert.equal(store.count("RevealConsent"), 252);
  assert.equal(store.count("MutualResonance"), 252);

  const result = await deleteAllRecords(store);
  assert.equal(result.complete, true);
  assert.equal(result.progress.imports, 21);
  assert.equal(result.progress.trees, 42);
  assert.equal(result.progress.candidates, 126);
  assert.equal(result.progress.consents, 252);
  assert.equal(result.progress.mutuals, 252);
  assert.equal(totalRemaining(store), 0);
});

test("delete_import drains 5000 events and 5000 signals without partial silent success", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedImport(store, 0, { events: 5000, signals: 5000, receipts: 250, trees: 1, candidatesPerTree: 2 });
  const result = await deleteImportRecords(store, watchImport);
  assert.equal(result.complete, true);
  assert.equal(result.progress.events, 5000);
  assert.equal(result.progress.signals, 5000);
  assert.equal(result.progress.receipts, 250);
  assert.equal(result.progress.imports, 1);
  assert.equal(totalRemaining(store), 0);
});

test("listAllRecords pages past the legacy 20/5000 caps", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 1234 });
  const events = await listAllRecords(store.entities.WatchEvent, { import_id: "imp_0" }, "watched_at");
  assert.equal(events.length, 1234);
});

test("interrupted deletion reports incomplete, keeps the import, and resumes idempotently", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 10 });
  const small = { pageSize: 4, maxPasses: 2 };

  store.controls.failDeletes = 100;
  const failed = await deleteAllRecords(store, small);
  assert.equal(failed.complete, false);
  assert.equal(store.count("WatchImport"), 1, "import must remain visible while deletion is incomplete");
  assert.equal(store.count("WatchEvent"), 10, "no event may silently survive a failed delete claim");

  store.controls.failDeletes = 0;
  const resumed = await deleteAllRecords(store, small);
  assert.equal(resumed.complete, true);
  assert.equal(totalRemaining(store), 0);

  const rerun = await deleteAllRecords(store, small);
  assert.equal(rerun.complete, true);
  assert.equal(rerun.progress.imports, 0);
  assert.equal(rerun.progress.events, 0);
});

test("clearDerivedRecords removes orphan mutuals even when no consent remains", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedImport(store, 0, { trees: 0 });
  await store.entities.WatchTreeFingerprint.create({ id: "tree_x", import_id: watchImport.id });
  await store.entities.SharedPathCandidate.create({ id: "cand_x", fingerprint_id: "tree_x", candidate_rank: 0 });
  await store.entities.MutualResonance.create({ id: "mutual_no_consent", candidate_id: "cand_x", state: "mutual" });

  const result = await clearDerivedRecords(store, watchImport.id);
  assert.equal(result.complete, true);
  assert.equal(result.progress.mutuals, 1);
  assert.equal(result.progress.consents, 0);
  assert.equal(store.count("MutualResonance"), 0);
  assert.equal(store.count("SharedPathCandidate"), 0);
  assert.equal(store.count("WatchTreeFingerprint"), 0);
});

test("drainRecords is bounded and reports incomplete when the budget exhausts", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 12 });
  store.controls.failDeletes = 1000;
  const result = await drainRecords(store.entities.WatchEvent, { import_id: "imp_0" }, "watched_at", { pageSize: 5, maxPasses: 3 });
  assert.equal(result.complete, false);
  assert.equal(store.count("WatchEvent"), 12);
});

test("reconcile deletes orphan mutuals without consent and dangling candidate references", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { trees: 0 });
  await store.entities.WatchTreeFingerprint.create({ id: "tree_ok", import_id: "imp_0" });
  await store.entities.SharedPathCandidate.create({ id: "cand_ok", fingerprint_id: "tree_ok", candidate_rank: 0 });
  await store.entities.RevealConsent.create({ id: "consent_ok", candidate_id: "cand_ok", state: "granted" });
  await store.entities.MutualResonance.create({ id: "mutual_ok", candidate_id: "cand_ok", state: "mutual" });

  // Orphan tree (its import is gone) with a mutual that has NO consent record.
  await store.entities.WatchTreeFingerprint.create({ id: "tree_orphan", import_id: "imp_gone" });
  await store.entities.SharedPathCandidate.create({ id: "cand_orphan", fingerprint_id: "tree_orphan", candidate_rank: 0 });
  await store.entities.MutualResonance.create({ id: "mutual_orphan", candidate_id: "cand_orphan", state: "mutual" });
  // Orphan candidate that has a consent but no mutual.
  await store.entities.SharedPathCandidate.create({ id: "cand_orphan2", fingerprint_id: "tree_orphan", candidate_rank: 1 });
  await store.entities.RevealConsent.create({ id: "consent_orphan", candidate_id: "cand_orphan2", state: "granted" });
  // Dangling records whose candidate no longer exists anywhere.
  await store.entities.MutualResonance.create({ id: "mutual_dangling", candidate_id: "cand_never_existed", state: "mutual" });
  await store.entities.RevealConsent.create({ id: "consent_dangling", candidate_id: "cand_never_existed", state: "granted" });

  const results = await reconcileOrphans(store, store.ownerId);
  const deleted = results.filter((item) => item.action === "deleted_orphan");
  const deletedIds = new Set(deleted.map((item) => item.id));

  assert.ok(deletedIds.has("mutual_orphan"), "orphan mutual without consent must be deleted");
  assert.ok(deletedIds.has("consent_orphan"));
  assert.ok(deletedIds.has("mutual_dangling"), "mutual whose candidate is gone must be deleted");
  assert.ok(deletedIds.has("consent_dangling"));
  assert.ok(deletedIds.has("tree_orphan"));
  assert.ok(deletedIds.has("cand_orphan"));

  assert.equal(store.count("MutualResonance"), 1, "valid mutual survives");
  assert.equal(store.count("RevealConsent"), 1, "valid consent survives");
  assert.equal(store.count("SharedPathCandidate"), 1);
  assert.equal(store.count("WatchTreeFingerprint"), 1);
});

test("restore attaches consent and mutual only for the active tree candidate set", () => {
  const candidates = [{ id: "cand_active" }];
  const consents = [
    { id: "consent_other", candidate_id: "cand_other_import", state: "granted" },
    { id: "consent_active", candidate_id: "cand_active", state: "granted" },
  ];
  const mutuals = [
    { id: "mutual_other", candidate_id: "cand_other_import", state: "mutual" },
    { id: "mutual_revoked", candidate_id: "cand_active", state: "simulated" },
  ];
  const scoped = scopeRestoredMatching(candidates, consents, mutuals);
  assert.equal(scoped.consent.id, "consent_active");
  assert.equal(scoped.mutual, null, "mutual from another candidate set is never attached");

  const empty = scopeRestoredMatching([], consents, mutuals);
  assert.equal(empty.consent, null);
  assert.equal(empty.mutual, null);

  const activeMutual = scopeRestoredMatching(candidates, consents, [...mutuals, { id: "mutual_active", candidate_id: "cand_active", state: "mutual" }]);
  assert.equal(activeMutual.mutual.id, "mutual_active");
});

test("privacy mutations clear stale consent and mutual state immediately", () => {
  const stale = {
    ...initialState,
    status: "ready",
    import: { id: "imp_1", matching_enabled: true },
    tree: { id: "tree_1" },
    candidates: [{ id: "cand_1" }],
    consent: { id: "consent_1", state: "granted" },
    mutual: { id: "mutual_1", state: "mutual" },
    matchingEnabled: true,
  };
  const cleared = watchTreeReducer(stale, {
    type: "READY",
    payload: { tree: { id: "tree_2" }, candidates: [], import: stale.import, matchingEnabled: true, consent: null, mutual: null },
  });
  assert.equal(cleared.consent, null);
  assert.equal(cleared.mutual, null);
  assert.equal(cleared.status, "ready");
  assert.equal(cleared.tree.id, "tree_2");

  const source = read("src/watchtree/WatchTreeExperience.jsx");
  const privacyBlock = source.slice(source.indexOf("const privacy ="), source.indexOf("const consent ="));
  assert.match(privacyBlock, /setSelectedTokens\(\[\]\);/);
  assert.match(privacyBlock, /consent: null,/);
  assert.match(privacyBlock, /mutual: null,/);
  for (const action of ["exclude_event", "exclude_creator", "exclude_date_range"]) {
    assert.match(source, new RegExp(`privacy\\("${action}"`));
  }
});

test("delete-all resume is bounded in the UI and driven by completion state", () => {
  const source = read("src/watchtree/WatchTreeExperience.jsx");
  const clearStart = source.indexOf("const clear =");
  const clearBlock = source.slice(clearStart, source.indexOf("return (", clearStart));
  assert.match(clearBlock, /result\?\.complete === false/);
  assert.match(clearBlock, /LIMITS\.deleteResumePasses/);
  assert.match(read("src/watchtree/constants.js"), /deleteResumePasses: 6/);
});

test("delete-watch-data delegates to the bounded deletion core and drops legacy caps", () => {
  const entry = read("base44/functions/delete-watch-data/entry.ts");
  assert.match(entry, /deleteAllRecords\(base44\)/);
  assert.match(entry, /deleteImportRecords\(base44, watchImport\)/);
  assert.match(entry, /clearDerivedRecords\(base44, importId\)/);
  assert.match(entry, /complete: result\.complete/);
  assert.match(entry, /listAllRecords\(base44\.entities\.WatchEvent/);
  assert.doesNotMatch(entry, /,5000,0\)/, "event/signal listings must not be capped at 5000");
  assert.doesNotMatch(entry, /,20,0\)/, "derived listings must not be capped at 20");
  assert.doesNotMatch(entry, /\\\\d\{4\}/, "date validation must use a real digit class");
  assert.match(entry, /\\d\{4\}-\\d\{2\}-\\d\{2\}/);
});

test("production restore scopes derived state to the active tree", () => {
  const source = read("src/watchtree/productionAdapter.js");
  assert.match(source, /scopeRestoredMatching\(candidates, consents, mutuals\)/);
  assert.match(source, /const \[candidates, consents, mutuals\] = tree/);
  assert.doesNotMatch(source, /consents\.find\(\(item\) => item\.state === "granted"\) \?\? null/);
});
