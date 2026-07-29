import { useEffect, useReducer, useRef, useCallback } from "react";
import { getTutorialCopy } from "./tutorial-copy.js";
import { createTutorialState, reducer, TUTORIAL_STEPS, executeStepTransition, deleteTutorialData } from "./tutorial-controller.js";
import { WatchTreeGraphic } from "../WatchTreeGraphic.jsx";

export function WatchTreeTutorial({ language = "en", adapter, onExit, onBuildOwn }) {
  const copy = getTutorialCopy(language);
  const [state, dispatch] = useReducer(reducer, null, createTutorialState);
  const inFlight = useRef(false);
  const headingRef = useRef(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (state.currentStep > TUTORIAL_STEPS.INACTIVE) {
      headingRef.current?.focus();
    }
  }, [state.currentStep]);

  const next = useCallback(async () => {
    if (state.transitionPending || inFlight.current) return;
    inFlight.current = true;
    const generation = generationRef.current;
    dispatch({ type: "TRANSITION_PENDING" });

    try {
      const nextStep = state.currentStep + 1;
      const result = await executeStepTransition(nextStep, adapter, state);
      if (!mountedRef.current || generationRef.current !== generation) return;
      dispatch(result);
    } catch (error) {
      if (!mountedRef.current || generationRef.current !== generation) return;
      dispatch({ type: "SET_ERROR", error: error?.message ?? "TRANSITION_FAILED" });
    } finally {
      inFlight.current = false;
    }
  }, [state, adapter]);

  const back = useCallback(() => {
    if (state.currentStep <= TUTORIAL_STEPS.STEP1) return;
    dispatch({ type: "SET_STEP", step: state.currentStep - 1 });
  }, [state.currentStep]);

  const handleExit = useCallback(() => {
    dispatch({ type: "EXIT" });
    onExit?.();
  }, [onExit]);

  const handleRestart = useCallback(() => {
    dispatch({ type: "RESTART" });
  }, []);

  const handleDelete = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const generation = generationRef.current;
    try {
      await deleteTutorialData(adapter);
      if (!mountedRef.current || generationRef.current !== generation) return;
      dispatch({ type: "DELETE_COMPLETE" });
    } catch {
      if (!mountedRef.current || generationRef.current !== generation) return;
      dispatch({ type: "SET_ERROR", error: "DELETE_FAILED" });
    } finally {
      inFlight.current = false;
    }
  }, [adapter]);

  const handleBuildOwn = useCallback(() => {
    dispatch({ type: "EXIT" });
    onBuildOwn?.();
  }, [onBuildOwn]);

  if (state.currentStep === TUTORIAL_STEPS.DELETE_COMPLETE) {
    return (
      <section className="tutorial tutorial-delete-complete" data-testid="tutorial-delete-complete" aria-label={copy.aria.deleteComplete}>
        <h2 ref={headingRef} tabIndex={-1} className="tutorial-step-title">{copy.deleteComplete.title}</h2>
        <p className="tutorial-step-detail">{copy.deleteComplete.body}</p>
        <div className="tutorial-finish-actions" data-testid="tutorial-delete-actions">
          <button className="button button--primary" data-testid="tutorial-build-after-delete" type="button" onClick={handleBuildOwn}>{copy.buildOwn}</button>
          <button className="button button--ghost" data-testid="tutorial-exit-after-delete" type="button" onClick={handleExit}>{copy.exit}</button>
        </div>
      </section>
    );
  }

  if (state.currentStep === TUTORIAL_STEPS.ENTRY) {
    return (
      <section className="tutorial tutorial-entry" data-testid="tutorial-entry" aria-label={copy.aria.entry}>
        <h2 ref={headingRef} tabIndex={-1} className="tutorial-entry-title">{copy.entry.title}</h2>
        <p className="tutorial-entry-body">{copy.entry.body}</p>
        <div className="tutorial-entry-choices">
          <button className="button button--primary tutorial-entry-btn" data-testid="tutorial-build-own" type="button" onClick={handleBuildOwn}>
            <strong>{copy.entry.primary}</strong>
          </button>
          <button className="button button--secondary tutorial-entry-btn" data-testid="tutorial-start-story" type="button" onClick={next}>
            <strong>{copy.entry.secondary}</strong>
          </button>
        </div>
      </section>
    );
  }

  if (state.currentStep >= TUTORIAL_STEPS.STEP1 && state.currentStep <= TUTORIAL_STEPS.STEP6) {
    const stepIndex = state.currentStep - 1;
    const step = copy.steps[stepIndex];
    const isLastStep = state.currentStep === TUTORIAL_STEPS.STEP6;
    const isCompleted = state.status === "completed";

    return (
      <section
        className="tutorial tutorial-step"
        data-testid={`tutorial-step-${state.currentStep}`}
        data-step={state.currentStep}
        aria-label={copy.aria.step(state.currentStep)}
        aria-busy={state.transitionPending}
      >
        <div className="tutorial-progress" role="progressbar" aria-valuenow={state.currentStep} aria-valuemin={1} aria-valuemax={6} aria-label={copy.progress.replace("{current}", state.currentStep)}>
          <div className="tutorial-progress-bar" style={{ width: `${(state.currentStep / 6) * 100}%` }} />
          <span className="tutorial-progress-text">{copy.progress.replace("{current}", state.currentStep)}</span>
        </div>

        {state.error ? <p className="form-message form-message--error" role="alert">{state.error}</p> : null}

        <div className="tutorial-step-content">
          <h2 ref={headingRef} tabIndex={-1} className="tutorial-step-title">{step.title}</h2>
          <p className="tutorial-step-subtitle">{step.subtitle}</p>

          {state.currentStep === TUTORIAL_STEPS.STEP1 && (
            <div className="tutorial-visual tutorial-visual--collection" data-testid="tutorial-visual-step1">
              <span className="tutorial-label">{step.label}</span>
              {state.events.length > 0 ? (
                <p className="tutorial-stat">{copy.status.eventsCollected(state.events.length)}</p>
              ) : state.transitionPending ? (
                <p className="tutorial-pending">{copy.status.seeding}</p>
              ) : null}
            </div>
          )}

          {state.currentStep === TUTORIAL_STEPS.STEP2 && (
            <div className="tutorial-visual" data-testid="tutorial-visual-step2">
              <span className="tutorial-label">{step.label}</span>
              {state.tree ? (
                <>
                  <p className="tutorial-stat">{copy.status.treeStats(state.tree.unique_content_count ?? 0, state.tree.repeat_signal_count ?? 0)}</p>
                  <WatchTreeGraphic events={state.events} label={copy.aria.watchTree} />
                </>
              ) : state.transitionPending ? (
                <p className="tutorial-pending">{copy.status.buildingTree}</p>
              ) : null}
            </div>
          )}

          {state.currentStep === TUTORIAL_STEPS.STEP3 && (
            <div className="tutorial-visual" data-testid="tutorial-visual-step3">
              <span className="tutorial-label tutorial-label--synthetic">{copy.truth.synthetic}</span>
              {state.candidates.length > 0 ? (
                <div className="tutorial-candidates">
                  {state.candidates.slice(0, 3).map((candidate, i) => (
                    <div key={candidate.id ?? i} className="tutorial-candidate">
                      <strong>{candidate.label ?? candidate.candidate_label ?? `Candidate ${i + 1}`}</strong>
                      <span className="score-band">{candidate.score_band ?? "matched"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="tutorial-stat">{copy.status.insufficientSignal}</p>
              )}
            </div>
          )}

          {state.currentStep === TUTORIAL_STEPS.STEP4 && (
            <div className="tutorial-visual" data-testid="tutorial-visual-step4">
              <span className="tutorial-label">{step.label}</span>
              {state.candidates?.[0]?.evidence_tokens ? (
                <div className="tutorial-evidence">
                  {state.candidates[0].evidence_tokens.slice(0, 3).map((token) => (
                    <div key={token.id} className={`tutorial-evidence-item tutorial-evidence--${token.type}`}>
                      <strong>{token.label}</strong>
                      <span>{copy.status.matchCount(token.count)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="tutorial-stat">{copy.status.noEvidence}</p>
              )}
            </div>
          )}

          {state.currentStep === TUTORIAL_STEPS.STEP5 && (
            <div className="tutorial-visual" data-testid="tutorial-visual-step5">
              <span className="tutorial-label tutorial-label--synthetic">{copy.truth.synthetic}</span>
              {state.consent ? (
                <p className="tutorial-stat">{copy.status.consentGranted}</p>
              ) : state.transitionPending ? (
                <p className="tutorial-pending">{copy.status.processingConsent}</p>
              ) : null}
              {state.mutual ? (
                <div className="tutorial-mutual">
                  <p className="tutorial-label tutorial-label--simulated">{copy.truth.simulated}</p>
                  <p>{state.mutual.message ?? copy.status.mutualMessage}</p>
                  <p className="tutorial-label tutorial-label--small">{copy.truth.noRealUser}</p>
                </div>
              ) : null}
            </div>
          )}

          {state.currentStep === TUTORIAL_STEPS.STEP6 && (
            <div className="tutorial-visual" data-testid="tutorial-visual-step6">
              <p className="tutorial-stat">{step.detail}</p>
            </div>
          )}

          <p className="tutorial-step-detail">{step.detail}</p>

          <div className="tutorial-truth">
            <span className="tutorial-label tutorial-label--small">{copy.truth.synthetic}</span>
            <span className="tutorial-label tutorial-label--small">{copy.truth.simulated}</span>
            <span className="tutorial-label tutorial-label--small">{copy.truth.noRealUser}</span>
          </div>
        </div>

        <div className="tutorial-controls">
          {!isLastStep ? (
            <button
              className="button button--primary tutorial-btn-next"
              data-testid="tutorial-next"
              type="button"
              onClick={next}
              disabled={state.transitionPending}
              aria-busy={state.transitionPending}
            >
              {state.transitionPending ? copy.status.working : copy.next}
            </button>
          ) : (
            <div className="tutorial-finish-actions" data-testid="tutorial-finish-actions">
              <button className="button button--primary" data-testid="tutorial-build-own-after" type="button" onClick={handleBuildOwn}>{copy.buildOwn}</button>
              <button className="button button--ghost" data-testid="tutorial-replay" type="button" onClick={handleRestart}>{copy.replay}</button>
              <button className="button button--ghost" data-testid="tutorial-delete-data" type="button" onClick={handleDelete}>{copy.deleteData}</button>
              <button className="button button--ghost" type="button" onClick={handleExit}>{copy.exit}</button>
            </div>
          )}
        </div>

        <div className="tutorial-secondary-controls">
          {state.currentStep > TUTORIAL_STEPS.STEP1 && !isLastStep ? (
            <button className="button button--ghost tutorial-btn-back" data-testid="tutorial-back" type="button" onClick={back} disabled={state.transitionPending}>
              {copy.back}
            </button>
          ) : null}
          {!isLastStep ? (
            <button className="button button--ghost tutorial-btn-exit" type="button" onClick={handleExit}>
              {copy.exit}
            </button>
          ) : null}
        </div>

        {isLastStep && (
          <details className="tutorial-base44-details" data-testid="tutorial-base44">
            <summary>{copy.base44.title}</summary>
            <ul>
              {copy.base44.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    );
  }

  return null;
}
