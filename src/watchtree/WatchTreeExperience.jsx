import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { getWatchTreeCopy } from "./copy.js";
import { selectedEvidenceTokensForCandidate } from "./matching.js";
import { initialState, watchTreeReducer } from "./state-machine.js";
import { LIMITS } from "./constants.js";
import { WatchTreeGraphic } from "./WatchTreeGraphic.jsx";
import { createWatchTreeRealtime } from "./realtime/createWatchTreeRealtime.js";
import { WatchTreeTutorial } from "./tutorial/WatchTreeTutorial.jsx";

const createWorker = () => new Worker(new URL("./watch-history.worker.js", import.meta.url), { type: "module" });

export function WatchTreeExperience({ language = "en", adapter, onLogout }) {
  const [tutorialActive, setTutorialActive] = useState(false);
  const copy = useMemo(() => getWatchTreeCopy(language), [language]);
  const [state, dispatch] = useReducer(watchTreeReducer, initialState);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [urlInput, setUrlInput] = useState("");
  const workerRef = useRef(null);
  const inFlight = useRef(new Set());

  const run = async (key, operation) => {
    if (inFlight.current.has(key)) return null;
    inFlight.current.add(key);
    try {
      return await operation();
    } catch (error) {
      dispatch({ type: "ERROR", error: `${copy.errors.unavailable} (${error?.code ?? error?.message ?? "OPERATION_FAILED"})` });
      return null;
    } finally {
      inFlight.current.delete(key);
    }
  };

  useEffect(() => {
    let active = true;
    void adapter.restore()
      .then((payload) => { if (active) dispatch({ type: "RESTORED", payload }); })
      .catch(() => { if (active) dispatch({ type: "ERROR", error: copy.errors.unavailable }); });
    return () => {
      active = false;
      workerRef.current?.postMessage({ type: "release" });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [adapter, copy.errors.unavailable]);

  // Keep a ref to the latest state so the realtime callback can check
  // whether a mutation is in-flight before dispatching RESTORED.
  const stateRef = useRef(state);
  stateRef.current = state;

  // States where the realtime subscription is allowed to dispatch RESTORED.
  // All other states (seeding, parsing, preview, resolving, url_preview,
  // adding, committing, matching, private) represent an in-flight user
  // operation that must not be overwritten by a background refresh.
  const REALTIME_SAFE_STATUSES = new Set(["idle", "ready", "error"]);

  // Realtime subscription: WatchEvent changes in other tabs trigger
  // a debounced restore through the normal state-machine path.
  // Subscription starts on mount and stops on unmount.
  useEffect(() => {
    const realtime = createWatchTreeRealtime({ adapter });

    realtime.start((data) => {
      // Guard: do not overwrite an in-flight mutation.
      const status = stateRef.current.status;
      if (!REALTIME_SAFE_STATUSES.has(status)) return;

      // Dispatch RESTORED — the state machine's normal restore path.
      // The realtime module calls adapter.restore() internally after
      // debounce, so the callback never modifies state directly.
      dispatch({ type: "RESTORED", payload: data });
    });

    return () => {
      realtime.stop();
    };
  }, [adapter]);

  const seed = () => run("seed", async () => {
    dispatch({ type: "BUSY", status: "seeding" });
    const result = await adapter.seedDemo();
    dispatch({ type: "READY", payload: result });
  });

  const resolveUrl = () => run("resolve-url", async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      dispatch({ type: "ERROR", error: copy.errors.urlInvalid });
      return;
    }
    dispatch({ type: "BUSY", status: "resolving" });
    const result = await adapter.resolveYouTubeVideo(trimmed);
    if (!result?.ok) {
      if (result?.error?.code === "VIDEO_UNAVAILABLE") dispatch({ type: "ERROR", error: copy.errors.videoUnavailable });
      else if (result?.error?.code === "METADATA_LOOKUP_FAILED") dispatch({ type: "ERROR", error: copy.errors.lookupFailed });
      else if (result?.error?.code === "URL_INVALID") dispatch({ type: "ERROR", error: copy.errors.urlInvalid });
      else dispatch({ type: "ERROR", error: `${copy.errors.lookupFailed} (${result?.error?.code})` });
      return;
    }
    if (!result?.metadata?.video_id) {
      dispatch({ type: "ERROR", error: copy.errors.lookupFailed });
      return;
    }
    dispatch({ type: "URL_PREVIEW", urlPreview: { metadata: result.metadata, confirmationToken: result.confirmation_token, watchedAt: new Date().toISOString().slice(0,16), privateNote: "", rewatch: false } });
  });

  const addUrlEvent = () => run("add-url", async () => {
    dispatch({ type: "BUSY", status: "adding" });
    const result = await adapter.addWatchUrlEvent({
      videoId: state.urlPreview.metadata.video_id,
      watchedAt: (state.urlPreview.watchedAt ? new Date(state.urlPreview.watchedAt) : new Date()).toISOString(),
      confirmationToken: state.urlPreview.confirmationToken,
      rewatch: state.urlPreview.rewatch ?? false,
      privateNote: state.urlPreview.privateNote ?? "",
    });
    if (!result?.ok) {
      dispatch({ type: "ERROR", error: `${copy.errors.unavailable} (${result?.error?.code})` });
      return;
    }
    const restored = await adapter.restore();
    if (restored.import) {
      const treeResult = await adapter.buildTree(restored.import.id);
      let candidates = [];
      if (restored.matchingEnabled && treeResult?.tree?.id) {
        const candidateResult = await adapter.findCandidates(treeResult.tree.id);
        candidates = candidateResult?.candidates ?? [];
      }
      dispatch({ type: "READY", payload: { ...restored, ...treeResult, candidates, urlPreview: null } });
    } else {
      dispatch({ type: "READY", payload: { ...restored, urlPreview: null } });
    }
  });

  const cancelUrlPreview = () => {
    setUrlInput("");
    dispatch({ type: "CANCEL_URL_PREVIEW" });
  };

  const parseFile = (file) => {
    dispatch({ type: "BUSY", status: "parsing" });
    workerRef.current?.terminate();
    const worker = createWorker();
    workerRef.current = worker;
    worker.onmessage = async ({ data }) => {
      if (!data.ok) {
        dispatch({ type: "ERROR", error: `${copy.errors.parse} (${data.error.code})` });
        worker.terminate();
        workerRef.current = null;
        return;
      }
      await run("preview", async () => {
        const sourceType = data.format === "json" ? "google_takeout_json" : "google_takeout_html";
        const validated = await adapter.validatePreview({
          source_type: sourceType,
          file_sha256: data.fileSha256,
          records: data.preview.events,
          counts: data.preview.counts,
        });
        dispatch({
          type: "PREVIEW",
          preview: {
            format: data.format,
            fileSha256: data.fileSha256,
            durationMs: data.durationMs,
            confirmation_token: validated.confirmation_token,
            records: validated.records,
            counts: {
              accepted: validated.counts.accepted,
              excluded: data.preview.counts.excluded + validated.counts.excluded,
              rejected: data.preview.counts.rejected + validated.counts.rejected,
            },
            errors: [...data.preview.errors, ...validated.errors].slice(0, 20),
          },
        });
      });
      worker.postMessage({ type: "release" });
      workerRef.current = null;
    };
    worker.postMessage({ type: "parse", file });
  };

  const confirm = () => run("commit", async () => {
    dispatch({ type: "BUSY", status: "committing" });
    const committed = await adapter.commitPreview({
      confirmation_token: state.preview.confirmation_token,
      file_sha256: state.preview.fileSha256,
      source_type: state.preview.format === "json" ? "google_takeout_json" : "google_takeout_html",
      records: state.preview.records,
      excluded_count: state.preview.counts.excluded,
      rejected_count: state.preview.counts.rejected,
    });
    dispatch({ type: "READY", payload: committed });
  });

  const cancel = () => {
    workerRef.current?.postMessage({ type: "release" });
    workerRef.current?.terminate();
    workerRef.current = null;
    dispatch({ type: "CANCEL_PREVIEW" });
  };

  const setMatching = (enabled) => run("matching", async () => {
    dispatch({ type: "BUSY", status: enabled ? "matching" : "private" });
    const action = enabled ? "enable_import_matching" : "disable_import_matching";
    let result = await adapter.mutatePrivacy(action, { import_id: state.import?.id });
    let round = 0;
    while (result?.complete === false && round < LIMITS.deleteMaxRounds) {
      round += 1;
      result = await adapter.mutatePrivacy(action, { import_id: state.import?.id });
    }
    if (result?.complete === false) throw new Error("DELETE_INCOMPLETE");
    if (!enabled) {
      setSelectedTokens([]);
      dispatch({ type: "MATCHING_DISABLED" });
      return;
    }
    const treeResult = await adapter.buildTree(state.import?.id);
    const candidateResult = await adapter.findCandidates(treeResult.tree?.id);
    dispatch({ type: "READY", payload: { ...treeResult, ...candidateResult, import: { ...state.import, matching_enabled: true }, matchingEnabled: true } });
  });

  const refreshAfterPrivacy = async () => {
    const treeResult = await adapter.buildTree(state.import?.id);
    if (!state.matchingEnabled) return { ...treeResult, candidates: [] };
    const candidateResult = await adapter.findCandidates(treeResult.tree?.id);
    return { ...treeResult, ...candidateResult };
  };

  const privacy = (action, payload) => run(`${action}:${JSON.stringify(payload)}`, async () => {
    let mutation = await adapter.mutatePrivacy(action, payload);
    let round = 0;
    while (mutation?.complete === false && round < LIMITS.deleteMaxRounds) {
      round += 1;
      mutation = await adapter.mutatePrivacy(action, payload);
    }
    if (mutation?.complete === false) throw new Error("DELETE_INCOMPLETE");
    setSelectedTokens([]);
    const refreshed = await refreshAfterPrivacy();
    dispatch({
      type: "READY",
      payload: {
        ...mutation,
        ...refreshed,
        import: state.import,
        matchingEnabled: state.matchingEnabled,
        consent: null,
        mutual: null,
      },
    });
  });

  const consent = (candidate) => run(`consent:${candidate.id}`, async () => {
    const candidateTokens = selectedEvidenceTokensForCandidate(candidate, selectedTokens);
    if (candidateTokens.length === 0) return;
    const result = await adapter.setConsent(candidate.id, candidateTokens, "grant");
    dispatch({ type: "CONSENT", consent: result.consent });
  });

  const withdraw = () => run("withdraw", async () => {
    const result = await adapter.setConsent(state.consent?.candidate_id, [], "revoke");
    setSelectedTokens([]);
    dispatch({ type: "CONSENT_REVOKED", consent: result.consent });
  });

  const mutual = () => run("mutual", async () => {
    const result = await adapter.simulateMutual(state.consent?.candidate_id);
    dispatch({ type: "MUTUAL", mutual: result.mutual });
  });

  const clear = (action, payload = {}) => run(action, async () => {
    let result = await adapter.mutatePrivacy(action, payload);
    let round = 0;
    while (result?.complete === false && round < LIMITS.deleteMaxRounds) {
      round += 1;
      result = await adapter.mutatePrivacy(action, payload);
    }
    if (result?.complete === false) throw new Error("DELETE_INCOMPLETE");
    setSelectedTokens([]);
    dispatch({ type: "CLEARED" });
  });

  return (
    <section className="watchtree-experience" id="experience" aria-labelledby="experience-title" data-status={state.status}>
      <header>
        <div>
          <span className="section-kicker">{copy.experience.member}</span>
          <h2 id="experience-title">{copy.experience.title}</h2>
          <p>{copy.experience.body}</p>
        </div>
        {onLogout ? <button className="text-action" type="button" onClick={onLogout}>{copy.experience.logout}</button> : null}
      </header>

      {state.status !== "idle" && state.status !== "ready" && state.status !== "preview" && state.status !== "error" && state.status !== "url_preview" ? (
        <p className="watchtree-progress" role="status" data-testid="watchtree-progress">{state.status}</p>
      ) : null}

      {/* Tutorial mode overrides the default entry UI */}
      {tutorialActive ? (
        <WatchTreeTutorial
          language={language}
          adapter={adapter}
          onExit={() => setTutorialActive(false)}
          onBuildOwn={() => { setTutorialActive(false); /* stays in product mode */ }}
        />
      ) : null}

      {!tutorialActive && !state.import && !state.preview && !state.urlPreview ? (
        <div className="url-collection" data-testid="url-collection">
          <div className="url-input-row">
            <input
              data-testid="url-input"
              type="url"
              placeholder={copy.experience.urlPlaceholder}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") resolveUrl(); }}
            />
            <button className="button button--primary" data-testid="url-lookup" type="button" onClick={resolveUrl} disabled={!urlInput.trim()}>
              {copy.experience.urlLookup}
            </button>
          </div>
          <div className="entry-choices" data-testid="entry-choices">
            <button className="entry-choice entry-choice--demo" data-testid="seed-demo" type="button" onClick={seed}>
              <strong>{copy.experience.demo}</strong>
              <small>48 synthetic events · watchtree-demo-v1</small>
            </button>
            <button className="entry-choice entry-choice--story" data-testid="start-tutorial" type="button" onClick={() => setTutorialActive(true)}>
              <strong>See Mina&rsquo;s WatchTree story</strong>
              <small>Guided 6-step demo · 45–75 seconds</small>
            </button>
            <details className="entry-choice entry-choice--advanced">
              <summary><strong>{copy.experience.import}</strong><small>{copy.experience.importDetails}</small></summary>
              <label className="file-input-label">
                <small>{copy.experience.fileHint}</small>
                <input
                  data-testid="watch-history-file"
                  type="file"
                  accept=".json,.html,.htm,application/json,text/html"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) parseFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </details>
          </div>
        </div>
      ) : null}

      {state.error ? <p className="form-message form-message--error" role="alert">{state.error}</p> : null}

      {state.urlPreview ? (
        <section className="url-preview-card" data-testid="url-preview">
          <h3>{copy.experience.preview}</h3>
          {state.urlPreview.metadata.thumbnail_url ? (
            <img src={state.urlPreview.metadata.thumbnail_url} alt="" className="url-preview-thumbnail" loading="lazy" />
          ) : null}
          <div className="url-preview-details">
            <strong>{state.urlPreview.metadata.bounded_title}</strong>
            <small>{state.urlPreview.metadata.bounded_creator_label}</small>
            {state.urlPreview.metadata.duration_seconds != null ? (
              <small>{Math.floor(state.urlPreview.metadata.duration_seconds / 60)}:{(state.urlPreview.metadata.duration_seconds % 60).toString().padStart(2, "0")}</small>
            ) : null}
          </div>
          <div className="url-preview-inputs" style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "16px 0" }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <small>Watched Date</small>
              <input type="datetime-local" value={state.urlPreview.watchedAt || ""} onChange={(e) => dispatch({ type: "UPDATE_URL_PREVIEW", payload: { watchedAt: e.target.value } })} />
            </label>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <small>Private Note (optional)</small>
              <input type="text" maxLength="500" placeholder="Why did you watch this?" value={state.urlPreview.privateNote || ""} onChange={(e) => dispatch({ type: "UPDATE_URL_PREVIEW", payload: { privateNote: e.target.value } })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={state.urlPreview.rewatch || false} onChange={(e) => dispatch({ type: "UPDATE_URL_PREVIEW", payload: { rewatch: e.target.checked } })} />
              <small>I have watched this before (rewatch)</small>
            </label>
          </div>
          <div className="button-row">
            <button className="button button--primary" data-testid="confirm-url-event" type="button" onClick={addUrlEvent}>{copy.experience.confirm}</button>
            <button className="button button--ghost" type="button" onClick={cancelUrlPreview}>{copy.experience.cancel}</button>
          </div>
        </section>
      ) : null}

      {state.preview ? (
        <section className="preview-card" data-testid="import-preview">
          <h3>{copy.experience.preview}</h3>
          <div className="preview-counts">
            <span>{state.preview.counts.accepted} {copy.experience.accepted}</span>
            <span>{state.preview.counts.excluded} {copy.experience.excluded}</span>
            <span>{state.preview.counts.rejected} {copy.experience.rejected}</span>
          </div>
          <p>{copy.experience.rawLocal}</p>
          <div className="button-row">
            <button className="button button--primary" data-testid="confirm-import" type="button" onClick={confirm}>{copy.experience.confirm}</button>
            <button className="button button--ghost" type="button" onClick={cancel}>{copy.experience.cancel}</button>
          </div>
        </section>
      ) : null}

      {state.import ? (
        <>
          <section className="url-collection url-collection--inline" data-testid="url-collection-inline">
            <div className="url-input-row">
              <input
                data-testid="url-input-inline"
                type="url"
                placeholder={copy.experience.urlPlaceholder}
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") resolveUrl(); }}
              />
              <button className="button button--primary" data-testid="url-lookup-inline" type="button" onClick={resolveUrl} disabled={!urlInput.trim()}>
                {copy.experience.urlLookup}
              </button>
            </div>
          </section>

          <section className="privacy-console" id="watchtree-privacy">
            <div><span>{copy.experience.matchingOff}</span><p>{copy.experience.rawLocal}</p></div>
            <label className="switch">
              <input data-testid="matching-toggle" type="checkbox" checked={state.matchingEnabled} onChange={(event) => setMatching(event.target.checked)} />
              <span>{state.matchingEnabled ? copy.experience.disableImport : copy.experience.enableMatching}</span>
            </label>
          </section>

          <section className="tree-result" data-product-result="watchtree" data-testid="watchtree-result">
            <div>
              <span className="section-kicker">{copy.experience.tree}</span>
              <h3>{state.tree?.unique_content_count ?? new Set(state.events.map((event) => event.normalized_content_id)).size} leaves · {state.tree?.repeat_signal_count ?? 0} revisits</h3>
              <p>{state.import.is_synthetic ? "Competition demo · no real viewing history" : copy.experience.rawLocal}</p>
            </div>
            <WatchTreeGraphic events={state.events} label={copy.experience.tree} />
          </section>

          <section className="event-review">
            <h3>{copy.experience.events}</h3>
            <div className="date-exclusion">
              <label>{copy.experience.dateFrom}<input type="date" value={dateRange.from} onChange={(event) => setDateRange((value) => ({ ...value, from: event.target.value }))} /></label>
              <label>{copy.experience.dateTo}<input type="date" value={dateRange.to} onChange={(event) => setDateRange((value) => ({ ...value, to: event.target.value }))} /></label>
              <button type="button" disabled={!dateRange.from || !dateRange.to} onClick={() => privacy("exclude_date_range", { import_id: state.import.id, ...dateRange })}>{copy.experience.applyDate}</button>
            </div>
            <ul>
              {state.events.slice(0, 24).map((event) => (
                <li key={event.id ?? `${event.normalized_content_id}:${event.watched_at}:${event.same_second_ordinal}`} className={event.sensitivity_excluded ? "is-excluded" : ""}>
                  <div><strong>{event.bounded_title}</strong><small>{event.bounded_creator_label || "Creator unavailable"} · {event.watched_at.slice(0, 10)}</small></div>
                  <button data-testid="exclude-event" type="button" disabled={event.sensitivity_excluded} onClick={() => privacy("exclude_event", { event_id: event.id, import_id: state.import.id })}>{copy.experience.excludeEvent}</button>
                  <button type="button" disabled={event.sensitivity_excluded || !event.bounded_creator_label} onClick={() => privacy("exclude_creator", { creator_label: event.bounded_creator_label, import_id: state.import.id })}>{copy.experience.excludeCreator}</button>
                </li>
              ))}
            </ul>
          </section>

          {state.matchingEnabled ? (
            <section className="candidate-list" data-product-result="candidates" data-testid="candidate-list">
              <h3>{copy.experience.candidates}</h3>
              {state.candidates.length === 0 ? (
                <p className="insufficient-signal">{copy.experience.insufficientSignal}</p>
              ) : null}
              {state.candidates.map((candidate) => (
                <article key={candidate.id} data-candidate={candidate.id}>
                  <header><div><span>{copy.experience.synthetic}</span><h4>{candidate.label ?? candidate.candidate_label}</h4></div><span className="score-band">{candidate.score_band}</span></header>
                  <div className="evidence-strip">
                    {(candidate.evidence_tokens ?? []).map((token) => (
                      <label key={token.id} className={`evidence evidence--${token.type}`}>
                        <input type="checkbox" checked={selectedTokens.includes(token.id)} onChange={(event) => setSelectedTokens((list) => event.target.checked ? [...new Set([...list, token.id])] : list.filter((id) => id !== token.id))} />
                        <strong>{token.label}</strong><span>{token.count}</span>
                      </label>
                    ))}
                  </div>
                  <button className="button button--primary" data-testid="reveal-consent" type="button" disabled={selectedEvidenceTokensForCandidate(candidate, selectedTokens).length === 0} onClick={() => consent(candidate)}>{copy.experience.reveal}</button>
                </article>
              ))}
            </section>
          ) : null}

          {state.consent?.state === "granted" ? (
            <section className="consent-state" data-testid="consent-state">
              <h3>{copy.experience.reveal}</h3>
              <div className="button-row">
                <button className="button button--primary" data-testid="simulate-mutual" type="button" onClick={mutual}>{copy.experience.mutual}</button>
                <button className="button button--ghost" data-testid="withdraw-consent" type="button" onClick={withdraw}>{copy.experience.withdraw}</button>
              </div>
            </section>
          ) : null}

          {state.mutual ? (
            <section className="mutual-state" data-testid="simulated-mutual">
              <span>{copy.experience.simulated}</span>
              <h3>{state.mutual.message ?? "Two synthetic paths now resonate."}</h3>
            </section>
          ) : null}

          <section className="destructive-actions">
            <button type="button" onClick={() => clear("delete_import", { import_id: state.import.id })}>{copy.experience.deleteImport}</button>
            <button type="button" onClick={() => clear("delete_all")}>{copy.experience.deleteAll}</button>
          </section>
        </>
      ) : !state.preview && !state.urlPreview ? <p className="empty-state">{copy.experience.empty}</p> : null}
    </section>
  );
}