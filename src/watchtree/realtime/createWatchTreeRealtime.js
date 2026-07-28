/**
 * createWatchTreeRealtime.js
 *
 * Isolated module for owner-scoped realtime WatchTree refresh.
 *
 * Each start() call creates a unique session object. All async paths
 * (subscribe callback, debounce timer, restore completion, onRestored
 * invocation) verify currentSession identity AND session.active before
 * proceeding. This prevents:
 *
 * - A stale callback from an old session firing after a new session starts
 * - A subscribe() resolution leaking its cleanup when the session is stopped
 *   while subscribe() is pending — the cleanup is called immediately
 * - A debounce timer or restore promise from an old session delivering its
 *   result after the session has been replaced
 *
 * Security:
 * - caller-scoped Base44 client (RLS preserved, no service role)
 * - logout/account switch: call stop() to unsubscribe
 * - stale callback ignored via session identity + active flag
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
  /** @type {{ id: number, active: boolean, onRestored: Function, unsubscribe: (() => void)|null, debounceTimer: ReturnType<typeof setTimeout>|null, startPromise: Promise<void>|null }|null} */
  let currentSession = null;

  /** @type {number} monotonic session counter */
  let nextSessionId = 0;

  /**
   * Start subscribing to WatchEvent changes.
   * Each burst of events triggers a single adapter.restore() after 200ms.
   *
   * If there is already an active session, returns its startPromise
   * without creating a second subscription.
   *
   * @param {(data: object) => void} onRestored
   *   Called once with the result of adapter.restore() after debounce.
   */
  async function start(onRestored) {
    if (currentSession?.active) return currentSession.startPromise;

    const session = {
      id: nextSessionId++,
      active: true,
      onRestored,
      unsubscribe: null,
      debounceTimer: null,
      startPromise: null,
    };

    currentSession = session;

    session.startPromise = (async () => {
      try {
        const cleanup = await adapter.subscribe(() => {
          // Guard: verify session identity AND active state.
          if (currentSession !== session || !session.active) return;

          // Debounce: 150-300ms window (200ms chosen)
          if (session.debounceTimer) clearTimeout(session.debounceTimer);
          session.debounceTimer = setTimeout(async () => {
            session.debounceTimer = null;
            if (currentSession !== session || !session.active) return;

            try {
              const data = await adapter.restore();
              if (currentSession === session && session.active && data) {
                session.onRestored(data);
              }
            } catch {
              // Fail silently — existing mutation responses and manual
              // restore continue to work without this subscription.
            }
          }, 200);
        });

        if (typeof cleanup === "function") {
          if (currentSession === session && session.active) {
            session.unsubscribe = cleanup;
          } else {
            // Session was stopped while adapter.subscribe() was pending.
            // Call the cleanup immediately so no resource is leaked.
            try { cleanup(); } catch { /* adapter cleanup should never throw */ }
          }
        }
      } catch {
        // Subscription unavailable (offline, no WebSocket, etc.)
        // Fallback: manual refresh still works through existing UI.
      }
    })();

    return session.startPromise;
  }

  /**
   * Stop subscribing and release all resources.
   * Safe to call multiple times.
   */
  function stop() {
    const session = currentSession;
    if (!session) return;

    session.active = false;

    if (session.debounceTimer) {
      clearTimeout(session.debounceTimer);
      session.debounceTimer = null;
    }

    if (typeof session.unsubscribe === "function") {
      session.unsubscribe();
      session.unsubscribe = null;
    }

    if (currentSession === session) {
      currentSession = null;
    }
  }

  return { start, stop };
}
