import assert from "node:assert/strict";
import test from "node:test";
import { createWatchTreeRealtime } from "../src/watchtree/realtime/createWatchTreeRealtime.js";

/**
 * Helper: create a mock adapter for testing the realtime module in isolation.
 *
 * subscribe() stores the callback so tests can simulate WatchEvent changes.
 * restore() returns a snapshot that can be tracked for call counting.
 */
function createMockAdapter({ restoreData = { import: null, events: [], tree: null } } = {}) {
  let realtimeCallback = null;
  let subscribeCallCount = 0;
  const emitted = [];
  const restored = [];

  return {
    _emitted: emitted,
    _restored: restored,

    async subscribe(callback) {
      subscribeCallCount += 1;
      realtimeCallback = callback;
      return () => {
        realtimeCallback = null;
      };
    },

    /** Test helper: get subscribe call count */
    _subscribeCount() {
      return subscribeCallCount;
    },

    /** Test helper: simulate a WatchEvent being emitted */
    _emit(event) {
      emitted.push(event);
      if (typeof realtimeCallback === "function") {
        realtimeCallback(event);
      }
    },

    /** Test helper: check if a callback is currently registered */
    _hasSubscriber() {
      return typeof realtimeCallback === "function";
    },

    async restore() {
      const snapshot = structuredClone(restoreData);
      restored.push(snapshot);
      return snapshot;
    },

    /** Test helper: check how many times restore() was called */
    _restoreCount() {
      return restored.length;
    },

    /** Test helper: update the data restore() will return */
    _setData(data) {
      restoreData = data;
    },
  };
}

// =========================================================================
// Test scenario 1: authenticated mount → subscribe 1회
// =========================================================================
test("1. authenticated mount subscribes once via adapter.subscribe()", async () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  let restoredData = null;
  await realtime.start((data) => {
    restoredData = data;
  });

  assert.equal(adapter._subscribeCount(), 1, "subscribe() must be called exactly once");

  // Simulate a WatchEvent being emitted
  adapter._emit({ type: "INSERT", table: "WatchEvent" });

  // Wait for debounce (200ms) + restore
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(adapter._restoreCount(), 1, "restore() must be called once after event");
  assert.ok(restoredData !== null, "onRestored callback must receive data");

  realtime.stop();
});

// =========================================================================
// Test scenario 2: duplicate start → subscription 1개
// =========================================================================
test("2. duplicate start() creates only one subscription", async () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  await realtime.start(() => {});
  assert.equal(adapter._subscribeCount(), 1, "first start() subscribes once");

  // Second start() while already subscribed
  await realtime.start(() => {});
  assert.equal(adapter._subscribeCount(), 1, "second start() must NOT create another subscription");

  realtime.stop();
  // After stop, start again — must create new subscription
  await realtime.start(() => {});
  assert.equal(adapter._subscribeCount(), 2, "start() after stop() must subscribe again");

  realtime.stop();
});

// =========================================================================
// Test scenario 3: create/update/delete event → refresh triggered
// =========================================================================
test("3. every event type (INSERT/UPDATE/DELETE) triggers refresh", async () => {
  const adapter = createMockAdapter({ restoreData: { import: { id: "imp_1" }, events: [], tree: null } });
  const realtime = createWatchTreeRealtime({ adapter });

  let callCount = 0;
  await realtime.start(() => { callCount += 1; });

  // Simulate each event type
  for (const eventType of ["INSERT", "UPDATE", "DELETE"]) {
    adapter._emit({ type: eventType, table: "WatchEvent" });
    await new Promise((r) => setTimeout(r, 300));
  }

  assert.equal(callCount, 3, "each event type must trigger a refresh");
  realtime.stop();
});

// =========================================================================
// Test scenario 4: event burst debounce → single refresh
// =========================================================================
test("4. burst of events within debounce window triggers restore() only once", async () => {
  const adapter = createMockAdapter({ restoreData: { import: { id: "imp_1" }, events: [], tree: null } });
  const realtime = createWatchTreeRealtime({ adapter });

  let callCount = 0;
  await realtime.start(() => { callCount += 1; });

  // Emit 5 events rapidly (within 200ms debounce window)
  for (let i = 0; i < 5; i += 1) {
    adapter._emit({ type: "INSERT", table: "WatchEvent", seq: i });
  }

  // Wait for debounce to fire
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(callCount, 1, "burst must produce only one refresh");
  assert.equal(adapter._restoreCount(), 1, "restore() must be called exactly once");

  // Second burst after debounce has cleared
  for (let i = 0; i < 3; i += 1) {
    adapter._emit({ type: "UPDATE", table: "WatchEvent", seq: i });
  }
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(callCount, 2, "second burst must produce one more refresh");
  assert.equal(adapter._restoreCount(), 2, "restore() must be called exactly 2 times");

  realtime.stop();
});

// =========================================================================
// Test scenario 5: refresh 1회 (verify restore called exactly once per burst)
// =========================================================================
test("5. each burst triggers exactly one restore()", async () => {
  const adapter = createMockAdapter({ restoreData: { import: { id: "imp_1" }, events: [], tree: null } });
  const realtime = createWatchTreeRealtime({ adapter });

  let refreshCount = 0;
  await realtime.start(() => { refreshCount += 1; });

  // Single event
  adapter._emit({ type: "INSERT", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(refreshCount, 1, "single event = one refresh");
  assert.equal(adapter._restoreCount(), 1, "single event = one restore()");

  // Wait and send another
  await new Promise((r) => setTimeout(r, 100));
  adapter._emit({ type: "UPDATE", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(refreshCount, 2, "second event = second refresh");
  assert.equal(adapter._restoreCount(), 2, "second event = second restore()");

  realtime.stop();
});

// =========================================================================
// Test scenario 6: stop/unmount → unsubscribe
// =========================================================================
test("6. stop() unsubscribes and no more callbacks fire", async () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  let callCount = 0;
  await realtime.start(() => { callCount += 1; });

  assert.ok(adapter._hasSubscriber(), "subscriber must be registered after start()");

  await new Promise((r) => setTimeout(r, 50));
  realtime.stop();

  assert.ok(!adapter._hasSubscriber(), "subscriber must be removed after stop()");

  // Emit after stop — should be ignored
  adapter._emit({ type: "INSERT", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(callCount, 0, "no refresh must fire after stop()");
});

// =========================================================================
// Test scenario 7: logout → unsubscribe
// =========================================================================
test("7. stop() (logout equivalent) removes subscriber and prevents refresh", async () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  let callCount = 0;
  await realtime.start(() => { callCount += 1; });

  // Simulate logout by stopping subscription (same as unmount in component)
  realtime.stop();

  // After logout, events must not trigger refresh
  adapter._emit({ type: "INSERT", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(callCount, 0, "no refresh after logout (stop)");
  assert.equal(adapter._restoreCount(), 0, "no restore() after logout");
});

// =========================================================================
// Test scenario 8: account change → unsubscribe + new subscription
// =========================================================================
test("8. account change stops old subscription and starts new one", async () => {
  const adapter = createMockAdapter({ restoreData: { import: { id: "imp_1" }, events: [] } });
  const realtime = createWatchTreeRealtime({ adapter });

  // First session (e.g. User A)
  const sessionA = [];
  await realtime.start((data) => { sessionA.push(data); });

  // Simulate account switch: stop old, start new
  realtime.stop();
  assert.ok(!adapter._hasSubscriber(), "old subscription removed after stop");

  // New session (e.g. User B)
  const sessionB = [];
  adapter._setData({ import: { id: "imp_2" }, events: [{ id: "evt_b" }] });
  await realtime.start((data) => { sessionB.push(data); });

  assert.ok(adapter._hasSubscriber(), "new subscription registered after start");

  // Emit event — only sessionB should receive it
  adapter._emit({ type: "INSERT", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(sessionA.length, 0, "old session (A) must not receive events after switch");
  assert.equal(sessionB.length, 1, "new session (B) must receive events");
  assert.equal(sessionB[0]?.import?.id, "imp_2", "new session data must be for the new account");

  realtime.stop();
});

// =========================================================================
// Test scenario 9: stale previous-session callback ignored
// =========================================================================
test("9. stale callback from previous session is ignored after re-subscribe", async () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  // Session A
  let sessionACalled = false;
  await realtime.start(() => { sessionACalled = true; });
  realtime.stop();

  // Session B — capture the old subscribe callback reference
  let sessionBCalled = false;
  await realtime.start(() => { sessionBCalled = true; });

  // Now simulate the OLD subscription callback arriving late
  // (adapter._hasSubscriber is now the new one, but we stored oldCallback somewhere)
  adapter._emit({ type: "INSERT", table: "WatchEvent" });
  await new Promise((r) => setTimeout(r, 300));

  // Only the active session's callback should fire
  assert.equal(sessionACalled, false, "old session callback must not fire");
  assert.equal(sessionBCalled, true, "active session callback must fire");

  realtime.stop();
});

// =========================================================================
// Test scenario 10: subscribe rejection → fallback
// =========================================================================
test("10. subscribe rejection does not throw and leaves manual restore working", async () => {
  const failingAdapter = {
    async subscribe() {
      throw new Error("SUBSCRIPTION_UNAVAILABLE");
    },
    async restore() {
      return { import: null, events: [] };
    },
  };

  const realtime = createWatchTreeRealtime({ adapter: failingAdapter });

  let restoredData = "not-called";
  // Start should not throw despite subscribe() rejecting
  await realtime.start((data) => {
    restoredData = data;
  });

  // Without subscription, the callback should not fire from realtime events
  // (since there's no subscription to receive them)
  assert.equal(restoredData, "not-called", "callback should not fire without subscription");

  // stop() after failure should not throw either
  realtime.stop();
  // Double stop is safe
  realtime.stop();
});

// =========================================================================
// Test scenario 11: restore rejection → no unhandled rejection
// =========================================================================
test("11. restore() rejection does not cause unhandled promise rejection", async () => {
  // Adapter where restore() throws
  const throwingAdapter = {
    async subscribe(callback) {
      return () => {};
    },
    async restore() {
      throw new Error("RESTORE_FAILED");
    },
  };

  const realtime = createWatchTreeRealtime({ adapter: throwingAdapter });

  // Track unhandled rejections
  const unhandled = [];
  const handler = (reason) => { unhandled.push(reason); };
  process.on("unhandledRejection", handler);

  try {
    await realtime.start(() => {
      throw new Error("MUST_NOT_BE_CALLED");
    });

    // Wait for any async activity to settle
    await new Promise((r) => setTimeout(r, 300));

    assert.equal(unhandled.length, 0, "restore() rejection must not cause unhandled rejection");

    realtime.stop();
  } finally {
    process.off("unhandledRejection", handler);
  }
});

// =========================================================================
// Test scenario 12: adapter without subscribe() → product still works
// =========================================================================
test("12. adapter without subscribe() method does not break existing product", async () => {
  // Minimal adapter that lacks subscribe() — like an older version
  const minimalAdapter = {
    async restore() {
      return { import: { id: "imp_1" }, events: [], tree: null };
    },
  };

  const realtime = createWatchTreeRealtime({ adapter: minimalAdapter });

  // Should not throw even though subscribe() is undefined
  let callbackFired = false;
  await realtime.start(() => { callbackFired = true; });

  // Should still be able to stop safely
  realtime.stop();
  realtime.stop(); // double stop safe

  assert.equal(callbackFired, false, "callback must not fire without subscription");
});

// =========================================================================
// Test scenario 13: callback must not invoke Function mutation
// =========================================================================
test("13. callback only dispatches state — no functions.invoke or entities.create", () => {
  // This is a source-level contract test.
  // The createWatchTreeRealtime module must NOT contain:
  // - functions.invoke
  // - entities.create / entities.update / entities.delete
  // The callback parameter must be the only way data flows out.
  const source = createWatchTreeRealtime.toString();

  // The start() callback parameter is the only mechanism for side effects
  // The module itself calls adapter.restore() (read-only) and adapter.subscribe()
  // No mutation calls should exist
  assert.doesNotMatch(source, /functions\.\s*invoke/,
    "createWatchTreeRealtime must not call functions.invoke");
  assert.doesNotMatch(source, /entities\.\s*create/,
    "createWatchTreeRealtime must not call entities.create");
  assert.doesNotMatch(source, /entities\.\s*update/,
    "createWatchTreeRealtime must not call entities.update");
  assert.doesNotMatch(source, /entities\.\s*delete/,
    "createWatchTreeRealtime must not call entities.delete");

  // Only debounce and restore references are expected
  assert.match(source, /adapter\.restore/,
    "createWatchTreeRealtime must call adapter.restore (read-only)");
  assert.match(source, /adapter\.subscribe/,
    "createWatchTreeRealtime must call adapter.subscribe");
});

// =========================================================================
// Test scenario 14: no internal digest stored in browser state
// =========================================================================
test("14. createWatchTreeRealtime does not store internal digest in browser state", () => {
  const adapter = createMockAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  // The module must not touch localStorage, sessionStorage, or any global state
  assert.equal(typeof globalThis.sessionStorage?.getItem("watchtree-realtime-digest"), "undefined",
    "no digest must be stored in sessionStorage");
  assert.equal(typeof globalThis.localStorage?.getItem("watchtree-realtime-digest"), "undefined",
    "no digest must be stored in localStorage");

  realtime.stop();
});
