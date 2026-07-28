import assert from "node:assert/strict";
import test from "node:test";
import { createWatchTreeRealtime } from "../src/watchtree/realtime/createWatchTreeRealtime.js";

/**
 * Helper: create a simple mock adapter.
 */
function createAdapter({ restoreData = { import: null, events: [], tree: null } } = {}) {
  let cb = null;
  let subCount = 0;
  const restored = [];

  return {
    _restored: restored,
    _subCount: () => subCount,
    _hasSub: () => typeof cb === "function",

    async subscribe(callback) {
      subCount += 1;
      cb = callback;
      return () => { cb = null; };
    },

    _emit(event) {
      if (typeof cb === "function") cb(event);
    },

    async restore() {
      const snap = structuredClone(restoreData);
      restored.push(snap);
      return snap;
    },

    _restoreCount: () => restored.length,
    _setData(d) { restoreData = d; },
  };
}

// =========================================================================
// 1. delayed subscribe fixture
// =========================================================================
test("1. delayed subscribe fixture — subscribe resolves after explicit trigger", async () => {
  let resolveSub = null;
  const adapter = {
    async subscribe(cb) {
      await new Promise((r) => { resolveSub = r; });
      this._cb = cb;
      return () => { this._cb = null; };
    },
    _cb: null,
    async restore() { return { import: null }; },
  };

  const realtime = createWatchTreeRealtime({ adapter });
  const p = realtime.start(() => {});
  assert.ok(resolveSub !== null, "subscribe pending");
  resolveSub();
  await p;
  realtime.stop();
});

// =========================================================================
// 2. start → stop before subscribe resolves → cleanup exactly once
// =========================================================================
test("2. subscribe pending → stop → cleanup on resolve", async () => {
  let resolveSub = null;
  let cleanupCalled = false;
  const adapter = {
    async subscribe(cb) {
      await new Promise((r) => { resolveSub = r; });
      this._cb = cb;
      return () => { cleanupCalled = true; this._cb = null; };
    },
    _cb: null,
    async restore() { return { import: null }; },
  };

  const realtime = createWatchTreeRealtime({ adapter });
  realtime.start(() => {}); // start, don't await
  assert.ok(resolveSub !== null, "subscribe pending");
  realtime.stop(); // stop while pending

  resolveSub(); // cleanup runs immediately on resolve
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(cleanupCalled, "cleanup called after pending resolve");
  assert.ok(!adapter._cb, "no subscriber after cleanup");
  realtime.stop(); // safe double stop
});

// =========================================================================
// 3. A pending → stop → B start → A cleanup on resolve → B active
// =========================================================================
test("3. A pending → stop → B start → A cleanup resolves → B active", async () => {
  let resolveA = null;
  let aCleanupCalled = false;
  let isFirstSubscribe = true;
  const adapter = {
    _callbacks: new Set(),
    async subscribe(cb) {
      if (isFirstSubscribe) {
        isFirstSubscribe = false;
        // A's subscribe is delayed (pending)
        await new Promise((r) => { resolveA = r; });
      }
      this._callbacks.add(cb);
      return () => {
        if (!isFirstSubscribe) aCleanupCalled = true;
        this._callbacks.delete(cb);
      };
    },
    _emit(event) {
      for (const cb of this._callbacks) cb(event);
    },
    async restore() { return { import: { id: "imp_1" } }; },
  };

  const realtime = createWatchTreeRealtime({ adapter });

  // Session A starts (subscribe pending)
  const aPromise = realtime.start(() => {});
  assert.ok(resolveA !== null, "A subscribe pending");

  // Stop A while subscribe pending
  realtime.stop();

  // Session B starts (subscribe immediate)
  let bData = null;
  await realtime.start((d) => { bData = d; });

  // Now A's pending subscribe resolves — cleanup should run immediately
  // (without affecting B's subscription)
  resolveA();
  await aPromise; // A's start promise resolves
  await new Promise((r) => setTimeout(r, 50));

  assert.ok(aCleanupCalled, "A cleanup called after pending resolve");

  // B's subscription must still be active
  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(bData !== null, "B received event");
  realtime.stop();
});

// =========================================================================
// 4. store old A callback reference separately
// =========================================================================
test("4. A callback reference stored — identity isolation", async () => {
  const adapter = createAdapter({ restoreData: { import: { id: "imp_1" } } });
  const realtime = createWatchTreeRealtime({ adapter });

  const aData = [];
  const bData = [];

  await realtime.start((d) => { aData.push(d); });
  const hadSubscriber = adapter._hasSub();
  realtime.stop();
  await realtime.start((d) => { bData.push(d); });

  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 300));

  assert.ok(hadSubscriber, "A had subscriber before stop");
  assert.equal(aData.length, 0, "A not invoked");
  assert.equal(bData.length, 1, "B invoked");
  realtime.stop();
});

// =========================================================================
// 5. A stop → B start → old A callback direct invoke → no effect
// =========================================================================
test("5. old A callback stops after B start — A onRestored 0, B onRestored 1", async () => {
  const adapter = createAdapter({ restoreData: { import: { id: "imp_1" } } });
  const realtime = createWatchTreeRealtime({ adapter });

  let aFired = false;
  let bFired = false;

  await realtime.start(() => { aFired = true; });
  realtime.stop();
  await realtime.start(() => { bFired = true; });

  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(aFired, false, "A not fired");
  assert.equal(bFired, true, "B fired");
  assert.equal(adapter._restoreCount(), 1, "restore once for B");
  realtime.stop();
});

// =========================================================================
// 6. current B callback fires exactly once per event
// =========================================================================
test("6. B callback fires once per event", async () => {
  const adapter = createAdapter({ restoreData: { import: { id: "imp_1" } } });
  const realtime = createWatchTreeRealtime({ adapter });

  let count = 0;
  await realtime.start(() => { count += 1; });

  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(count, 1, "fired once");
  assert.equal(adapter._restoreCount(), 1, "restore once");
  realtime.stop();
});

// =========================================================================
// 7. old debounce timer after stop/restart → no delivery
// =========================================================================
test("7. old debounce timer after stop/restart → delivery 0", async () => {
  const adapter = createAdapter({ restoreData: { import: { id: "imp_1" } } });
  const realtime = createWatchTreeRealtime({ adapter });

  let aCount = 0;
  let bCount = 0;

  await realtime.start(() => { aCount += 1; });
  adapter._emit({ type: "INSERT" }); // starts A's debounce

  // Stop before debounce fires (200ms), then start B
  realtime.stop();
  await realtime.start(() => { bCount += 1; });

  // Wait for A's debounce to have fired (it shouldn't affect B)
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(aCount, 0, "A not fired");
  assert.equal(bCount, 0, "B not fired (no event for B)");
  assert.equal(adapter._restoreCount(), 0, "no stale restore");

  // Now emit for B
  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(bCount, 1, "B fires for new event");
  realtime.stop();
});

// =========================================================================
// 8. restore pending 중 stop → old result discarded
// =========================================================================
test("8. restore pending → stop → old result not delivered", async () => {
  let restoreResolve = null;
  const adapter = {
    _callbacks: new Set(),
    _restoreCount: 0,
    async subscribe(cb) {
      this._callbacks.add(cb);
      return () => { this._callbacks.delete(cb); };
    },
    _emit(event) {
      for (const cb of this._callbacks) cb(event);
    },
    async restore() {
      this._restoreCount += 1;
      await new Promise((r) => { restoreResolve = r; });
      return { import: { id: "imp_old" } };
    },
  };

  const realtime = createWatchTreeRealtime({ adapter });

  let result = "none";
  await realtime.start((d) => { result = d?.import?.id; });

  // Emit → debounce starts (200ms) → restore() called
  adapter._emit({ type: "INSERT" });
  await new Promise((r) => setTimeout(r, 250)); // wait for debounce to fire

  // restore() is now pending (awaiting restoreResolve)
  assert.ok(restoreResolve !== null, "restore pending after debounce");
  assert.equal(adapter._restoreCount, 1, "restore called");

  // Stop while restore is pending
  realtime.stop();

  // Resolve the pending restore
  restoreResolve();
  await new Promise((r) => setTimeout(r, 50));

  // Since session was stopped, result should not have changed
  assert.equal(result, "none", "old restore result not delivered after stop");
  realtime.stop();
});

// =========================================================================
// 9. restore rejection with event emit → unhandledRejection 0
// =========================================================================
test("9. restore rejection with event → restore 1, unhandledRejection 0", async () => {
  const adapter = {
    _cb: null,
    _rc: 0,
    async subscribe(cb) {
      this._cb = cb;
      return () => { this._cb = null; };
    },
    async restore() {
      this._rc += 1;
      throw new Error("RESTORE_FAILED");
    },
  };

  const realtime = createWatchTreeRealtime({ adapter });

  const unhandled = [];
  const handler = (r) => { unhandled.push(r); };
  process.on("unhandledRejection", handler);

  try {
    let called = false;
    await realtime.start(() => { called = true; });

    adapter._cb({ type: "INSERT" });
    await new Promise((r) => setTimeout(r, 300));

    assert.equal(adapter._rc, 1, "restore called once after event");
    assert.equal(unhandled.length, 0, "no unhandled rejection");
    assert.equal(called, false, "onRestored not called");
    realtime.stop();
  } finally {
    process.off("unhandledRejection", handler);
  }
});

// =========================================================================
// 10. duplicate start → same session → subscribe 1회
// =========================================================================
test("10. duplicate start — subscribe called once", async () => {
  const adapter = createAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  await realtime.start(() => {});
  assert.equal(adapter._subCount(), 1, "first start: subscribed once");

  await realtime.start(() => {});
  assert.equal(adapter._subCount(), 1, "duplicate start: no new subscribe");

  realtime.stop();

  await realtime.start(() => {});
  assert.equal(adapter._subCount(), 2, "after stop: new subscribe");
  realtime.stop();
});

// =========================================================================
// 11. adapter without subscribe → fallback
// =========================================================================
test("11. adapter without subscribe — no crash", async () => {
  const realtime = createWatchTreeRealtime({
    adapter: { async restore() { return { import: null }; } },
  });

  let fired = false;
  await realtime.start(() => { fired = true; });
  realtime.stop();
  realtime.stop(); // double stop safe

  assert.equal(fired, false, "not fired");
});

// =========================================================================
// 12. double stop safe
// =========================================================================
test("12. double stop safe — no error", async () => {
  const adapter = createAdapter();
  const realtime = createWatchTreeRealtime({ adapter });

  await realtime.start(() => {});

  realtime.stop();
  assert.ok(!adapter._hasSub(), "no subscriber after first stop");

  realtime.stop();
  assert.ok(!adapter._hasSub(), "still no subscriber after second stop");

  realtime.stop(); // third stop
  assert.ok(!adapter._hasSub(), "still no subscriber after third stop");
});
