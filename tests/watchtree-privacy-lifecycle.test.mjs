import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createMockBase44Store } from "./harness/mockBase44Store.js";
import {
  clearDerivedRecords,
  createDeleteBudget,
  deleteAllRecords,
  deleteImportRecords,
  DELETE_BATCH_SIZE,
  DELETE_OPERATION_BUDGET,
  drainRecords,
  listAllRecords,
} from "../base44/functions/_shared/watchtree.js";
import { reconcileOrphans } from "../base44/functions/_shared/reconcile.js";
import { restoreScopedMatching } from "../src/watchtree/restore.js";
import { initialState, watchTreeReducer } from "../src/watchtree/state-machine.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");
const MAX_DELETE_ROUNDS = 40;

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

// Mirrors the client contract: each Function call gets a fresh operation
// budget; the caller repeats with a fresh budget until complete, bounded by
// MAX_DELETE_ROUNDS so no loop is unbounded.
async function deleteInRounds(runner) {
  const totals = { imports: 0, trees: 0, candidates: 0, consents: 0, mutuals: 0, events: 0, receipts: 0, signals: 0 };
  let result;
  let rounds = 0;
  do {
    const budget = createDeleteBudget();
    result = await runner(budget);
    for (const key of Object.keys(totals)) totals[key] += result.progress[key] ?? 0;
    rounds += 1;
    assert.ok(rounds <= MAX_DELETE_ROUNDS, `deletion must finish within ${MAX_DELETE_ROUNDS} rounds`);
  } while (result.complete === false);
  return { result, totals, rounds };
}

test("bounded deletion contract constants match the recommended values", () => {
  assert.equal(DELETE_BATCH_SIZE, 50);
  assert.equal(DELETE_OPERATION_BUDGET, 400);
  assert.equal(createDeleteBudget().remaining, 400);
});

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

  const { result, totals, rounds } = await deleteInRounds((budget) => deleteAllRecords(store, budget));
  assert.equal(result.complete, true);
  assert.ok(rounds >= 2, "819 owner records cannot complete inside one 400-operation budget");
  assert.equal(totals.imports, 21);
  assert.equal(totals.trees, 42);
  assert.equal(totals.candidates, 126);
  assert.equal(totals.consents, 252);
  assert.equal(totals.mutuals, 252);
  assert.equal(totalRemaining(store), 0);
});

test("delete_import drains 5000 events and 5000 signals without partial silent success", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedImport(store, 0, { events: 5000, signals: 5000, receipts: 250, trees: 1, candidatesPerTree: 2 });
  const { result, totals, rounds } = await deleteInRounds((budget) => deleteImportRecords(store, watchImport, budget));
  assert.equal(result.complete, true);
  assert.equal(totals.events, 5000);
  assert.equal(totals.signals, 5000);
  assert.equal(totals.receipts, 250);
  assert.equal(totals.imports, 1);
  assert.ok(rounds <= MAX_DELETE_ROUNDS);
  assert.equal(totalRemaining(store), 0);
});

test("a single call never exceeds its operation budget and reports incomplete", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 5000, signals: 5000, receipts: 250 });
  const budget = createDeleteBudget();
  const result = await deleteImportRecords(store, watchImportOf(store), budget);
  assert.equal(result.complete, false, "10k+ records cannot complete in one 400-operation call");
  assert.ok(budget.remaining <= 0, "budget must be exhausted, not ignored");
  assert.equal(store.count("WatchImport"), 1, "import stays visible until fully deleted");
  assert.ok(store.count("WatchEvent") > 0);
});

function watchImportOf(store) {
  return { id: "imp_0" };
}

test("listAllRecords pages past the legacy 20/5000 caps", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 1234 });
  const events = await listAllRecords(store.entities.WatchEvent, { import_id: "imp_0" }, "watched_at");
  assert.equal(events.length, 1234);
});

test("interrupted deletion reports incomplete, keeps the import, and resumes idempotently", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { events: 10 });

  store.controls.failDeletes = 100;
  const failed = await deleteAllRecords(store, createDeleteBudget(24));
  assert.equal(failed.complete, false);
  assert.equal(store.count("WatchImport"), 1, "import must remain visible while deletion is incomplete");
  assert.equal(store.count("WatchEvent"), 10, "no event may silently survive a failed delete claim");

  store.controls.failDeletes = 0;
  const resumed = await deleteInRounds((budget) => deleteAllRecords(store, budget));
  assert.equal(resumed.result.complete, true);
  assert.equal(totalRemaining(store), 0);

  const rerun = await deleteAllRecords(store, createDeleteBudget());
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

  const result = await clearDerivedRecords(store, watchImport.id, createDeleteBudget());
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
  const budget = createDeleteBudget(12);
  const result = await drainRecords(store.entities.WatchEvent, { import_id: "imp_0" }, "watched_at", budget, { batchSize: 5 });
  assert.equal(result.complete, false);
  assert.equal(budget.remaining, 0);
  assert.equal(store.count("WatchEvent"), 12);
});

test("a candidate with more than one budget of children survives until fully drained", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedImport(store, 0, { trees: 1, candidatesPerTree: 1, consentsPerCandidate: 200, mutualsPerCandidate: 250 });
  // 450 child rows exceed the 400-operation budget of a single call.
  const first = await deleteImportRecords(store, watchImport, createDeleteBudget());
  assert.equal(first.complete, false);
  assert.equal(store.count("MutualResonance"), 0, "mutuals drain first and fully");
  assert.equal(store.count("RevealConsent"), 50, "remaining consents survive with the candidate");
  assert.equal(store.count("SharedPathCandidate"), 1, "candidate must not be deleted before its children are verified empty");
  assert.equal(store.count("WatchTreeFingerprint"), 1, "tree must not be deleted before its candidates are gone");
  assert.equal(store.count("WatchImport"), 1, "import must not be deleted before its children are gone");

  const { result, rounds } = await deleteInRounds((budget) => deleteImportRecords(store, watchImport, budget));
  assert.equal(result.complete, true);
  assert.ok(rounds <= MAX_DELETE_ROUNDS);
  assert.equal(totalRemaining(store), 0, "resumed calls finish with every related Entity at zero");
});

test("failed child deletes retain the parent chain instead of orphaning children", async () => {
  const store = createMockBase44Store();
  await seedImport(store, 0, { trees: 1, candidatesPerTree: 1, consentsPerCandidate: 1, mutualsPerCandidate: 1 });
  store.controls.failDeletes = 1000;
  const result = await deleteImportRecords(store, { id: "imp_0" }, createDeleteBudget(30));
  assert.equal(result.complete, false);
  assert.equal(store.count("MutualResonance"), 1, "mutual survives its failed delete");
  assert.equal(store.count("RevealConsent"), 1);
  assert.equal(store.count("SharedPathCandidate"), 1, "candidate is retained while its mutual remains");
  assert.equal(store.count("WatchTreeFingerprint"), 1);
  assert.equal(store.count("WatchImport"), 1);

  store.controls.failDeletes = 0;
  const resumed = await deleteInRounds((budget) => deleteAllRecords(store, budget));
  assert.equal(resumed.result.complete, true);
  assert.equal(totalRemaining(store), 0);
});

test("delete_all sweeps owner-scoped orphans when zero imports remain", async () => {
  const store = createMockBase44Store();
  // The exact orphan state finding 1 could create: the import is gone but
  // rows remain across every related Entity.
  await store.entities.WatchEvent.create({ import_id: "imp_gone" });
  await store.entities.WatchEvent.create({ import_id: "imp_gone" });
  await store.entities.WatchMatchSignal.create({ import_id: "imp_gone" });
  await store.entities.ImportChunkReceipt.create({ import_id: "imp_gone" });
  await store.entities.WatchTreeFingerprint.create({ id: "tree_gone", import_id: "imp_gone" });
  await store.entities.SharedPathCandidate.create({ id: "cand_gone", fingerprint_id: "tree_gone" });
  await store.entities.RevealConsent.create({ candidate_id: "cand_gone", state: "granted" });
  await store.entities.MutualResonance.create({ candidate_id: "cand_gone", state: "mutual" });
  assert.equal(store.count("WatchImport"), 0);

  const { result } = await deleteInRounds((budget) => deleteAllRecords(store, budget));
  assert.equal(result.complete, true, "complete requires all eight collections verified empty");
  assert.equal(totalRemaining(store), 0);
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

test("privacy exclusion resumes bounded derived cleanup past one budget", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedImport(store, 0, { events: 3, trees: 1, candidatesPerTree: 250, consentsPerCandidate: 1, mutualsPerCandidate: 1 });
  // 250 candidates x (mutual + consent) + tree = 501 derived operations,
  // more than one 400-operation budget behind a single exclusion.
  const runExclusion = async () => {
    const events = await listAllRecords(store.entities.WatchEvent, { import_id: watchImport.id }, "watched_at");
    await store.entities.WatchEvent.update(events[0].id, { matching_enabled: false, sensitivity_excluded: true, exclusion_reason: "item" });
    return clearDerivedRecords(store, watchImport.id, createDeleteBudget());
  };

  let cleanup = await runExclusion();
  assert.equal(cleanup.complete, false, "expected budget exhaustion must surface as complete:false, not an exception");
  assert.ok(store.count("SharedPathCandidate") > 0, "derived cleanup is partial after one budget");
  assert.equal(store.count("WatchImport"), 1, "an exclusion never deletes the import");

  let rounds = 1;
  while (cleanup.complete === false) {
    cleanup = await runExclusion();
    rounds += 1;
    assert.ok(rounds <= MAX_DELETE_ROUNDS, "repeated exclusion actions must stay within the bounded round cap");
  }
  assert.equal(store.count("SharedPathCandidate"), 0);
  assert.equal(store.count("RevealConsent"), 0);
  assert.equal(store.count("MutualResonance"), 0);
  assert.equal(store.count("WatchTreeFingerprint"), 0);
  assert.equal(store.count("WatchImport"), 1);
  const after = await listAllRecords(store.entities.WatchEvent, { import_id: watchImport.id }, "watched_at");
  assert.equal(after[0].sensitivity_excluded, true, "repeated exclusion actions stay idempotent");
  assert.equal(after.length, 3);
});

test("restore queries consent and mutual scoped to the active candidate only", async () => {
  const store = createMockBase44Store();
  // Stale candidate B from another import/tree: NEWER records that a global
  // "latest record" query would wrongly prefer.
  await store.entities.SharedPathCandidate.create({ id: "cand_B", fingerprint_id: "tree_stale", candidate_rank: 0 });
  await store.entities.RevealConsent.create({ id: "consent_B", candidate_id: "cand_B", state: "granted", created_date: "2026-05-02T00:00:00.000Z" });
  await store.entities.MutualResonance.create({ id: "mutual_B", candidate_id: "cand_B", state: "mutual", created_date: "2026-05-02T00:00:00.000Z" });
  // Active candidate A of the restored tree.
  const candidateA = await store.entities.SharedPathCandidate.create({ id: "cand_A", fingerprint_id: "tree_active", candidate_rank: 0 });
  await store.entities.RevealConsent.create({ id: "consent_A", candidate_id: "cand_A", state: "granted", created_date: "2026-05-01T00:00:00.000Z" });
  await store.entities.MutualResonance.create({ id: "mutual_A", candidate_id: "cand_A", state: "mutual", created_date: "2026-05-01T00:00:00.000Z" });

  const consentQueries = [];
  const mutualQueries = [];
  const consentFilter = store.entities.RevealConsent.filter.bind(store.entities.RevealConsent);
  const mutualFilter = store.entities.MutualResonance.filter.bind(store.entities.MutualResonance);
  store.entities.RevealConsent.filter = (criteria, ...rest) => { consentQueries.push(criteria); return consentFilter(criteria, ...rest); };
  store.entities.MutualResonance.filter = (criteria, ...rest) => { mutualQueries.push(criteria); return mutualFilter(criteria, ...rest); };

  const result = await restoreScopedMatching(store, [candidateA]);
  assert.equal(result.consent.id, "consent_A", "stale candidate B consent must never be attached");
  assert.equal(result.mutual.id, "mutual_A");
  assert.ok(consentQueries.length > 0, "consent must be fetched with real Entity queries");
  for (const criteria of consentQueries) assert.equal(criteria.candidate_id, "cand_A", "consent queries must be candidate-scoped");
  for (const criteria of mutualQueries) assert.equal(criteria.candidate_id, "cand_A", "mutual queries must scope to the selected consent candidate");
});

test("restore rules: zero candidates, revoked consent, and unselected mutual", async () => {
  const store = createMockBase44Store();
  await store.entities.RevealConsent.create({ id: "consent_B", candidate_id: "cand_B", state: "granted" });
  await store.entities.MutualResonance.create({ id: "mutual_B", candidate_id: "cand_B", state: "mutual" });

  const empty = await restoreScopedMatching(store, []);
  assert.equal(empty.consent, null);
  assert.equal(empty.mutual, null);

  // Revoked consent on the active candidate: never restored.
  const candidateA = await store.entities.SharedPathCandidate.create({ id: "cand_A", fingerprint_id: "tree_active", candidate_rank: 0 });
  await store.entities.RevealConsent.create({ id: "consent_revoked", candidate_id: "cand_A", state: "revoked" });
  const revoked = await restoreScopedMatching(store, [candidateA]);
  assert.equal(revoked.consent, null);
  assert.equal(revoked.mutual, null, "without an active granted consent, mutual is never restored");

  // Granted consent but the only mutual belongs to another candidate.
  await store.entities.RevealConsent.create({ id: "consent_A", candidate_id: "cand_A", state: "granted" });
  const noMutual = await restoreScopedMatching(store, [candidateA]);
  assert.equal(noMutual.consent.id, "consent_A");
  assert.equal(noMutual.mutual, null, "mutual from another candidate set is never attached");

  // Deterministic candidate_rank ordering: first candidate has no grant, second does.
  const candidateC = await store.entities.SharedPathCandidate.create({ id: "cand_C", fingerprint_id: "tree_active", candidate_rank: 1 });
  await store.entities.RevealConsent.create({ id: "consent_C", candidate_id: "cand_C", state: "granted" });
  await store.entities.MutualResonance.create({ id: "mutual_C", candidate_id: "cand_C", state: "mutual" });
  await store.entities.RevealConsent.delete("consent_A");
  const ranked = await restoreScopedMatching(store, [candidateA, candidateC]);
  assert.equal(ranked.consent.id, "consent_C");
  assert.equal(ranked.mutual.id, "mutual_C");
});

test("restore selects the globally latest granted consent, not rank-first", async () => {
  const store = createMockBase44Store();
  const rank1 = await store.entities.SharedPathCandidate.create({ id: "cand_rank1", fingerprint_id: "tree_active", candidate_rank: 0 });
  const rank2 = await store.entities.SharedPathCandidate.create({ id: "cand_rank2", fingerprint_id: "tree_active", candidate_rank: 1 });
  await store.entities.RevealConsent.create({ id: "consent_old", candidate_id: "cand_rank1", state: "granted", created_date: "2026-05-01T00:00:00.000Z" });
  await store.entities.MutualResonance.create({ id: "mutual_old", candidate_id: "cand_rank1", state: "mutual", created_date: "2026-05-01T00:00:00.000Z" });
  await store.entities.RevealConsent.create({ id: "consent_new", candidate_id: "cand_rank2", state: "granted", created_date: "2026-05-03T00:00:00.000Z" });
  await store.entities.MutualResonance.create({ id: "mutual_new", candidate_id: "cand_rank2", state: "mutual", created_date: "2026-05-03T00:00:00.000Z" });

  const result = await restoreScopedMatching(store, [rank1, rank2]);
  assert.equal(result.consent.id, "consent_new", "newer grant on rank-2 must win over the older rank-1 grant");
  assert.equal(result.mutual.id, "mutual_new", "mutual is queried only for the selected candidate");
});

test("restore breaks created_date ties by candidate_rank then candidate_id", async () => {
  const store = createMockBase44Store();
  const sameDate = "2026-05-01T00:00:00.000Z";
  const rankB = await store.entities.SharedPathCandidate.create({ id: "cand_b", fingerprint_id: "tree_active", candidate_rank: 1 });
  const rankA = await store.entities.SharedPathCandidate.create({ id: "cand_a", fingerprint_id: "tree_active", candidate_rank: 0 });
  await store.entities.RevealConsent.create({ id: "consent_b", candidate_id: "cand_b", state: "granted", created_date: sameDate });
  await store.entities.RevealConsent.create({ id: "consent_a", candidate_id: "cand_a", state: "granted", created_date: sameDate });

  const byRank = await restoreScopedMatching(store, [rankB, rankA]);
  assert.equal(byRank.consent.id, "consent_a", "equal dates fall back to the lower candidate_rank regardless of list order");
  assert.equal(byRank.mutual, null);
});

test("privacy exclusion regression flow clears consent, mutual, and evidence without reload", () => {
  for (const action of ["exclude_event", "exclude_creator", "exclude_date_range"]) {
    let state = initialState;
    // 1. demo seed
    state = watchTreeReducer(state, { type: "READY", payload: { import: { id: "imp_1", matching_enabled: false }, events: [{ id: "e1" }], tree: { id: "tree_seed" }, candidates: [{ id: "cand_seed" }], matchingEnabled: false } });
    // 2. matching enable with fresh candidates
    state = watchTreeReducer(state, { type: "READY", payload: { import: { id: "imp_1", matching_enabled: true }, events: [{ id: "e1" }], tree: { id: "tree_enabled" }, candidates: [{ id: "cand_fresh" }], matchingEnabled: true } });
    // 3. candidate token selection is component state (selectedTokens)
    // 4. reveal consent
    state = watchTreeReducer(state, { type: "CONSENT", consent: { id: "consent_1", state: "granted", candidate_id: "cand_fresh" } });
    // 5. simulate mutual
    state = watchTreeReducer(state, { type: "MUTUAL", mutual: { id: "mutual_1", state: "mutual" } });
    assert.equal(state.consent.id, "consent_1");
    assert.equal(state.mutual.id, "mutual_1");
    // 6. privacy exclusion: component dispatches READY with regenerated
    //    tree/candidates and explicit consent/mutual nulls
    state = watchTreeReducer(state, {
      type: "READY",
      payload: {
        import: { id: "imp_1", matching_enabled: true },
        events: [{ id: "e1" }],
        tree: { id: `tree_after_${action}` },
        candidates: [{ id: `cand_after_${action}` }],
        matchingEnabled: true,
        consent: null,
        mutual: null,
      },
    });
    // 7. no reload required: consent 0, mutual 0, fresh candidates shown
    assert.equal(state.consent, null, `${action}: consent display must be cleared`);
    assert.equal(state.mutual, null, `${action}: mutual display must be cleared`);
    assert.equal(state.status, "ready");
    assert.equal(state.candidates[0].id, `cand_after_${action}`, `${action}: fresh candidates must be shown`);
    assert.equal(state.tree.id, `tree_after_${action}`);
  }

  // checked evidence 0 = selectedTokens reset, and explicit nulls dispatched
  const source = read("src/watchtree/WatchTreeExperience.jsx");
  const privacyBlock = source.slice(source.indexOf("const privacy ="), source.indexOf("const consent ="));
  assert.match(privacyBlock, /setSelectedTokens\(\[\]\);/);
  assert.match(privacyBlock, /consent: null,/);
  assert.match(privacyBlock, /mutual: null,/);
  for (const action of ["exclude_event", "exclude_creator", "exclude_date_range"]) {
    assert.match(source, new RegExp(`privacy\\("${action}"`));
  }
});

test("delete rounds are bounded in the UI and never claim false completion", () => {
  const source = read("src/watchtree/WatchTreeExperience.jsx");
  const clearStart = source.indexOf("const clear =");
  const clearBlock = source.slice(clearStart, source.indexOf("return (", clearStart));
  assert.match(clearBlock, /result\?\.complete === false/);
  assert.match(clearBlock, /round < LIMITS\.deleteMaxRounds/);
  assert.match(clearBlock, /throw new Error\("DELETE_INCOMPLETE"\)/, "exhausted rounds must surface an error, not success");

  const privacyStart = source.indexOf("const privacy =");
  const privacyBlock = source.slice(privacyStart, source.indexOf("const consent ="));
  assert.match(privacyBlock, /while \(mutation\?\.complete === false && round < LIMITS\.deleteMaxRounds\)/, "privacy actions must resume bounded cleanup");
  assert.match(privacyBlock, /throw new Error\("DELETE_INCOMPLETE"\)/);
  assert.ok(privacyBlock.indexOf("refreshAfterPrivacy") > privacyBlock.indexOf("DELETE_INCOMPLETE"), "UI state refreshes only after cleanup completes");

  const matchingStart = source.indexOf("const setMatching =");
  const matchingBlock = source.slice(matchingStart, source.indexOf("const refreshAfterPrivacy"));
  assert.match(matchingBlock, /while \(result\?\.complete === false && round < LIMITS\.deleteMaxRounds\)/, "disable_import_matching must resume too");

  assert.match(read("src/watchtree/constants.js"), /deleteMaxRounds: 40/);
});

test("delete-watch-data delegates to the bounded deletion core and drops legacy caps", () => {
  const entry = read("base44/functions/delete-watch-data/entry.ts");
  assert.match(entry, /createDeleteBudget\(\)/);
  assert.match(entry, /deleteAllRecords\(base44, budget\)/);
  assert.match(entry, /deleteImportRecords\(base44, watchImport, budget\)/);
  assert.match(entry, /clearDerivedRecords\(base44, watchImport\.id, budget\)/);
  assert.match(entry, /privacyResponse\(cleanup, budget/);
  assert.match(entry, /complete: cleanup\.complete/);
  assert.match(entry, /budget_remaining: budget\.remaining/);
  assert.match(entry, /listAllRecords\(base44\.entities\.WatchEvent/);
  assert.doesNotMatch(entry, /DERIVED_DELETE_INCOMPLETE/, "expected budget exhaustion must not become an exception");
  assert.doesNotMatch(entry, /,5000,0\)/, "event/signal listings must not be capped at 5000");
  assert.doesNotMatch(entry, /,20,0\)/, "derived listings must not be capped at 20");
  assert.doesNotMatch(entry, /\\\\d\{4\}/, "date validation must use a real digit class");
  assert.match(entry, /\\d\{4\}-\\d\{2\}-\\d\{2\}/);
});

test("production restore uses candidate-scoped Entity queries, never global listings", () => {
  const adapter = read("src/watchtree/productionAdapter.js");
  assert.match(adapter, /restoreScopedMatching\(base44, candidates\)/);
  assert.match(adapter, /SharedPathCandidate\.filter\(\{ fingerprint_id: tree\.id \}, "candidate_rank", 20, 0\)/);
  assert.doesNotMatch(adapter, /RevealConsent\.list\(/, "consent must not be listed globally for the caller");
  assert.doesNotMatch(adapter, /MutualResonance\.list\(/, "mutual must not be listed globally for the caller");
  assert.doesNotMatch(adapter, /scopeRestoredMatching/);

  const restore = read("src/watchtree/restore.js");
  assert.match(restore, /RevealConsent\.filter\(\{ candidate_id: candidate\.id, state: "granted" \}/);
  assert.match(restore, /MutualResonance\.filter\(\{ candidate_id: selected\.consent\.candidate_id, state: "mutual" \}/);
  assert.match(restore, /if \(allowlist\.length === 0\) return \{ consent: null, mutual: null \};/);
  assert.match(restore, /if \(!selected\) return \{ consent: null, mutual: null \};/);
  assert.match(restore, /latestDate > selectedDate/, "the globally latest granted consent wins");
  assert.match(restore, /rank < selected\.rank/, "deterministic candidate_rank tie-break");
});
