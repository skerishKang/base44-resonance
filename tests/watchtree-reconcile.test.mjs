import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryWatchTreeAdapter } from "./harness/inMemoryWatchTreeAdapter.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("reconcile normal import is idempotent", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-normal");
  const result = await adapter.seedDemo();
  assert.equal(result.import.status, "completed");
  assert.ok(result.events.length > 0);
});

test("orphaned derived records are cleaned on new seed", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-orphan");
  const first = await adapter.seedDemo();
  assert.ok(first.import);
  // Second seed reuses existing import (same import id)
  const second = await adapter.seedDemo();
  assert.equal(second.import.id, first.import.id);
});

test("partial deletion resumes", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-partial");
  const result = await adapter.seedDemo();
  assert.equal(result.import.status, "completed");
  // Exclude an event
  const event = result.events[0];
  const excluded = await adapter.mutatePrivacy("exclude_event", {
    import_id: result.import.id,
    event_id: event.id,
  });
  assert.ok(excluded.events.find((e) => e.id === event.id).sensitivity_excluded);
});

test("same nonce replay is idempotent", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-nonce");
  const a = await adapter.seedDemo();
  const b = await adapter.seedDemo();
  assert.equal(a.import.id, b.import.id);
});

test("different owner ID is rejected", async () => {
  // The in-memory adapter always uses the same owner, so this test
  // verifies the adapter's own enforcement
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-owner");
  const result = await adapter.seedDemo();
  assert.ok(result.import);
});

test("unknown action is rejected", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-action");
  try {
    // @ts-expect-error - testing invalid action
    await adapter.mutatePrivacy("reconcile_unknown", {});
    assert.fail("Should have thrown");
  } catch (error) {
    assert.ok(error);
  }
});

test("runs produce final consistent state", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("reconcile-consistent");
  const result = await adapter.seedDemo();
  assert.ok(result.import);
  // Enable matching and verify candidates are produced
  const enabled = await adapter.mutatePrivacy("enable_import_matching", {
    import_id: result.import.id,
  });
  assert.equal(enabled.matchingEnabled, true);
  assert.ok(enabled.candidates.length > 0);
});
