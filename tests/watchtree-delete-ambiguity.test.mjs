import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { installApiAlias } from "./harness/apiAlias.mjs";
import { setMockBase44Client } from "./harness/mockBase44Client.mjs";
import { createMockBase44Store } from "./harness/mockBase44Store.js";
import { createDeleteBudget, deleteImportRecords } from "../base44/functions/_shared/watchtree.js";

installApiAlias(fileURLToPath(new URL("./harness/mockBase44Client.mjs", import.meta.url)));
const { createProductionWatchTreeAdapter } = await import("../src/watchtree/productionAdapter.js");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const COLLECTIONS = ["WatchImport", "WatchEvent", "WatchMatchSignal", "ImportChunkReceipt", "WatchTreeFingerprint", "SharedPathCandidate", "RevealConsent", "MutualResonance"];
const residue = (store) => COLLECTIONS.reduce((sum, name) => sum + store.count(name), 0);

async function seedOwnedImport(store, importId) {
  await store.entities.WatchImport.create({ id: importId, status: "completed", matching_enabled: true });
  for (let i = 0; i < 5; i += 1) {
    await store.entities.WatchEvent.create({ id: `${importId}_ev_${i}`, import_id: importId, watched_at: `2026-03-01T0${i}:00:00.000Z` });
  }
  await store.entities.WatchMatchSignal.create({ id: `${importId}_sig`, import_id: importId });
  await store.entities.ImportChunkReceipt.create({ id: `${importId}_rcp`, import_id: importId });
  await store.entities.WatchTreeFingerprint.create({ id: `${importId}_tree`, import_id: importId, stale: false });
  for (let c = 0; c < 2; c += 1) {
    const candidateId = `${importId}_cand_${c}`;
    await store.entities.SharedPathCandidate.create({ id: candidateId, fingerprint_id: `${importId}_tree`, candidate_rank: c });
    await store.entities.RevealConsent.create({ id: `${candidateId}_consent`, candidate_id: candidateId, state: "granted" });
    await store.entities.MutualResonance.create({ id: `${candidateId}_mutual`, candidate_id: candidateId, state: "mutual" });
  }
  return { id: importId };
}

function createScriptedClient(store, behaviors) {
  const calls = [];
  const queue = [...behaviors];
  return {
    calls,
    entities: store.entities,
    functions: {
      async invoke(name, payload) {
        calls.push({ name, payload: structuredClone(payload) });
        const behavior = queue.shift();
        if (!behavior) throw new Error("UNSCRIPTED_INVOCATION");
        return behavior(store, payload);
      },
    },
  };
}

const transportError = (status) => {
  const error = new Error(`transport failure ${status}`);
  error.response = { status };
  return error;
};

const unavailableEnvelope = () => ({ data: { ok: false, error: { code: "RESOURCE_UNAVAILABLE", retryable: false } } });

// Emulates the real delete-watch-data entry: the shared deletion core runs
// against the caller-scoped store, and a missing import yields the same
// RESOURCE_UNAVAILABLE envelope the backend returns.
const backendDelete = async (store, payload) => {
  let existing = null;
  try { existing = await store.entities.WatchImport.get(payload.import_id); } catch { existing = null; } // unavailable() semantics
  if (!existing) return unavailableEnvelope();
  const budget = createDeleteBudget();
  const result = await deleteImportRecords(store, existing, budget);
  return { data: { ok: true, deleted: result.complete, complete: result.complete, progress: { ...result.progress, budget_remaining: budget.remaining }, events: [], tree: null, candidates: [] } };
};

test("delete_import whose success response was lost completes on the same-nonce retry", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedOwnedImport(store, "imp_owned");
  const client = createScriptedClient(store, [
    async (scriptedStore, payload) => {
      await backendDelete(scriptedStore, payload); // deletion fully completes server-side
      throw transportError(503); // but the success response never reaches the client
    },
    backendDelete, // retry reaches the backend: the import is gone
  ]);
  setMockBase44Client(client);

  const result = await createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: watchImport.id });

  assert.equal(client.calls.length, 2, "exactly one retry after the lost response");
  assert.equal(result.ok, true);
  assert.equal(result.complete, true, "the ambiguous retry resolving to RESOURCE_UNAVAILABLE is delete_import completion");
  assert.equal(result.deleted, true);
  assert.equal(result.ambiguity_resolved, true);
  assert.ok(client.calls[0].payload.client_nonce, "request carries a nonce");
  assert.equal(client.calls[1].payload.client_nonce, client.calls[0].payload.client_nonce, "retry keeps the same nonce");
  assert.deepEqual(client.calls[1].payload, client.calls[0].payload, "retry keeps the same payload");
  assert.equal(residue(store), 0, "backend residue is zero across all eight collections");
});

test("delete_import succeeds normally when the retry reaches a live import", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedOwnedImport(store, "imp_live");
  const client = createScriptedClient(store, [
    async () => { throw transportError(502); }, // transport fails before the backend runs
    backendDelete,
  ]);
  setMockBase44Client(client);

  const result = await createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: watchImport.id });

  assert.equal(result.complete, true);
  assert.equal(result.ambiguity_resolved, undefined, "a real success is not an ambiguity resolution");
  assert.equal(client.calls[1].payload.client_nonce, client.calls[0].payload.client_nonce);
  assert.equal(residue(store), 0);
});

test("RESOURCE_UNAVAILABLE on the first attempt remains an error", async () => {
  const store = createMockBase44Store();
  const client = createScriptedClient(store, [async () => unavailableEnvelope()]);
  setMockBase44Client(client);

  await assert.rejects(
    () => createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: "imp_never_existed" }),
    (error) => error.code === "RESOURCE_UNAVAILABLE",
  );
  assert.equal(client.calls.length, 1, "a first-attempt 404 is never retried into success");
});

test("cross-user import id remains an error and leaves the owner's data untouched", async () => {
  const store = createMockBase44Store();
  await seedOwnedImport(store, "imp_owner");
  const client = createScriptedClient(store, [async () => unavailableEnvelope()]);
  setMockBase44Client(client);

  await assert.rejects(
    () => createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: "imp_someone_else" }),
    (error) => error.code === "RESOURCE_UNAVAILABLE",
  );
  assert.equal(store.count("WatchImport"), 1, "the owner's import survives a foreign-id attempt");
  assert.equal(residue(store), 15);
});

test("exhausted retryable attempts still surface the transport error", async () => {
  const store = createMockBase44Store();
  const watchImport = await seedOwnedImport(store, "imp_down");
  const client = createScriptedClient(store, [
    async () => { throw transportError(503); },
    async () => { throw transportError(503); },
    async () => { throw transportError(503); },
  ]);
  setMockBase44Client(client);

  await assert.rejects(
    () => createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: watchImport.id }),
    (error) => error?.response?.status === 503,
  );
  assert.equal(client.calls.length, 3);
  assert.equal(store.count("WatchImport"), 1, "no false completion when every attempt fails in transport");
});

test("non-retryable function errors are not retried", async () => {
  const store = createMockBase44Store();
  const client = createScriptedClient(store, [async () => ({ data: { ok: false, error: { code: "ACTION_UNSUPPORTED", retryable: false } } })]);
  setMockBase44Client(client);

  await assert.rejects(
    () => createProductionWatchTreeAdapter().mutatePrivacy("delete_import", { import_id: "imp_x" }),
    (error) => error.code === "ACTION_UNSUPPORTED",
  );
  assert.equal(client.calls.length, 1);
});

test("production adapter wires the delete_import ambiguity policy with one shared request", () => {
  const source = read("src/watchtree/productionAdapter.js");
  const mutateStart = source.indexOf("async mutatePrivacy(action, payload)");
  const mutateBlock = source.slice(mutateStart, source.indexOf("},", mutateStart));
  assert.match(mutateBlock, /const request = \{/, "one request object is built per mutation");
  assert.match(mutateBlock, /client_nonce: nonce\(\)/, "the nonce is minted once per mutation, not per attempt");
  assert.match(mutateBlock, /if \(action === "delete_import"\) return invokeDestructiveWithAmbiguity\("delete-watch-data", request\);/);

  const policyStart = source.indexOf("async function invokeDestructiveWithAmbiguity");
  const policyBlock = source.slice(policyStart, source.indexOf("export function splitTransportChunks"));
  assert.match(policyBlock, /sawRetryableAmbiguity && result\.error\?\.code === "RESOURCE_UNAVAILABLE"/, "only post-ambiguity 404s read as completion");
  assert.match(policyBlock, /sawRetryableAmbiguity = true;/, "the flag is set only when a retryable error is actually retried");
  assert.match(policyBlock, /complete: true/);
});
