/**
 * createWatchTreeRealtime.js
 *
 * Isolated module for owner-scoped realtime WatchTree refresh.
 *
 * Listens for WatchEvent create/update/delete events via the production
 * adapter's subscribe() wrapper and triggers a single debounced
 * adapter.restore() per burst. The restored data is forwarded to the
 * component's state machine through the normal RESTORED path.
 *
 * Security:
 * - caller-scoped Base44 client (RLS preserved, no service role)
 * - logout/account switch: call stop() to unsubscribe
 * - stale callback ignored via active flag
 * - internal digest never stored in browser state
 * - cross-user events never reach the callback (RLS)
 *
 * Usage:
 *   const realtime = createWatchTreeRealtime({ adapter });
 *   realtime.start((data) => dispatch({ type: "RESTORED", payload: data }));
 *   // later:
 *   realtime.stop();
 */

export function createWatchTreeRealtime({ adapter }) {
  /** @type {boolean} guards against stale callbacks after stop() */
  let active = false;

  /** @type {(() => void)|null} unsubscribe function from adapter.subscribe() */
  let unsubscribe = null;

  /** @type {Promise<void>|null} guards against concurrent start() calls */
  let subscribeGuard = null;

  /** @type {ReturnType<typeof setTimeout>|null} */
  let debounceTimer = null;

  /**
   * Start subscribing to WatchEvent changes.
   * Each burst of events triggers a single adapter.restore() after 200ms.
   * Safe to call multiple times — concurrent calls are serialised.
   *
   * @param {(data: object) => void} onRestored
   *   Called once with the result of adapter.restore() after debounce.
   *   The component should dispatch through its state machine:
   *   `dispatch({ type: "RESTORED", payload: data })`
   */
  async function start(onRestored) {
    if (unsubscribe) return; // already subscribed
    if (subscribeGuard) return subscribeGuard; // concurrent start in flight

    active = true;

    subscribeGuard = (async () => {
      try {
        const cleanup = await adapter.subscribe(() => {
          if (!active) return; // stale callback guard

          // Debounce: 150-300ms window (200ms chosen)
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            debounceTimer = null;
            if (!active) return;

            try {
              const data = await adapter.restore();
              if (active && data) onRestored(data);
            } catch {
              // Fail silently — existing mutation responses and manual
              // restore continue to work without this subscription.
            }
          }, 200);
        });

        if (typeof cleanup === "function" && active) {
          unsubscribe = cleanup;
        }
      } catch {
        // Subscription unavailable (offline, no WebSocket, etc.)
        // Fallback: manual refresh still works through existing UI.
      }
    })();

    await subscribeGuard;
    subscribeGuard = null;
  }

  /**
   * Stop subscribing and release all resources.
   * Safe to call multiple times.
   */
  function stop() {
    active = false;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (typeof unsubscribe === "function") {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return { start, stop };
}
