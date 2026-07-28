/**
 * tutorial-controller.js
 *
 * State controller for the guided Next-only judge tutorial.
 *
 * Each Next click advances through exactly one step of a 6-step pipeline
 * that calls real adapter methods (seedDemo, buildTree, findCandidates,
 * setConsent, simulateMutual, mutatePrivacy). The controller never
 * modifies state directly — it delegates to the adapter and passes
 * results back via callbacks.
 *
 * State: inactive → active → step 1..6 → completed
 *
 * Duplicate-click guard: transitionPending prevents concurrent transitions.
 * Realtime guard: tutorial transitions are not affected by realtime events.
 */

export const TUTORIAL_STEPS = Object.freeze({
  INACTIVE: -1,
  ENTRY: 0,
  STEP1: 1,  // Deliberate collection
  STEP2: 2,  // Private tree growth
  STEP3: 3,  // Synthetic match
  STEP4: 4,  // Explainable evidence
  STEP5: 5,  // Consent and simulated mutual
  STEP6: 6,  // Finish with control
  COMPLETED: 7,
});

export function createTutorialState() {
  return {
    status: "inactive",  // inactive | active | completed
    currentStep: TUTORIAL_STEPS.INACTIVE,
    transitionPending: false,
    error: "",
    // Cached tutorial data for display
    events: [],
    tree: null,
    candidates: [],
    consent: null,
    mutual: null,
    importId: null,
    selectedTokenIds: [],
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case "START_TUTORIAL":
      return { ...state, status: "active", currentStep: TUTORIAL_STEPS.ENTRY, error: "" };
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "TRANSITION_PENDING":
      return { ...state, transitionPending: true };
    case "TRANSITION_DONE":
      return { ...state, transitionPending: false };
    case "SET_STEP_DATA":
      return { ...state, ...action.payload, currentStep: action.currentStep, transitionPending: false, error: "" };
    case "SET_ERROR":
      return { ...state, transitionPending: false, error: action.error };
    case "EXIT":
      return createTutorialState();
    case "RESTART":
      return { ...createTutorialState(), status: "active", currentStep: TUTORIAL_STEPS.ENTRY };
    case "COMPLETED":
      return { ...state, status: "completed", currentStep: TUTORIAL_STEPS.COMPLETED, transitionPending: false };
    default:
      return state;
  }
}

/**
 * Execute the transition for the given step.
 * Returns a promise that resolves when the step transition is complete.
 *
 * @param {number} step - The step to execute
 * @param {object} adapter - WatchTree adapter
 * @param {object} state - Current tutorial state
 * @returns {Promise<{type: string, payload?: object}>} - Action to dispatch
 */
export async function executeStepTransition(step, adapter, state) {
  switch (step) {
    case TUTORIAL_STEPS.STEP1: {
      // Step 1: seed demo — creates synthetic demo data
      const result = await adapter.seedDemo();
      const importId = result?.import?.id;
      if (!importId) throw new Error("SEED_FAILED");
      // Build tree for display
      const treeResult = await adapter.buildTree(importId);
      return {
        type: "SET_STEP_DATA",
        payload: {
          currentStep: TUTORIAL_STEPS.STEP1,
          importId,
          events: result.events ?? [],
          tree: treeResult?.tree ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP2: {
      // Step 2: show tree — restore current state
      const restored = await adapter.restore();
      if (!restored?.import) throw new Error("RESTORE_FAILED");
      return {
        type: "SET_STEP_DATA",
        payload: {
          currentStep: TUTORIAL_STEPS.STEP2,
          importId: restored.import.id,
          events: restored.events ?? [],
          tree: restored.tree ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP3: {
      // Step 3: enable matching + find candidates
      const importId = state.importId;
      if (!importId) throw new Error("NO_IMPORT");
      const mutation = await adapter.mutatePrivacy("enable_import_matching", { import_id: importId });
      if (!mutation) throw new Error("MATCHING_FAILED");
      const treeResult = await adapter.buildTree(importId);
      const candidateResult = await adapter.findCandidates(treeResult?.tree?.id);
      const candidates = candidateResult?.candidates ?? [];
      if (candidates.length === 0) {
        return {
          type: "SET_STEP_DATA",
          payload: {
            currentStep: TUTORIAL_STEPS.STEP3,
            tree: treeResult?.tree ?? null,
            candidates: [],
          },
        };
      }
      return {
        type: "SET_STEP_DATA",
        payload: {
          currentStep: TUTORIAL_STEPS.STEP3,
          tree: treeResult?.tree ?? null,
          candidates,
        },
      };
    }

    case TUTORIAL_STEPS.STEP4: {
      // Step 4: show evidence — pick top candidate's tokens
      const topCandidate = state.candidates?.[0];
      if (!topCandidate) throw new Error("NO_CANDIDATES");
      const evidenceTokens = (topCandidate.evidence_tokens ?? []).slice(0, 3);
      const tokenIds = evidenceTokens.map((t) => t.id);
      return {
        type: "SET_STEP_DATA",
        payload: {
          currentStep: TUTORIAL_STEPS.STEP4,
          selectedTokenIds: tokenIds,
        },
      };
    }

    case TUTORIAL_STEPS.STEP5: {
      // Step 5: consent + simulate mutual
      const topCandidate = state.candidates?.[0];
      if (!topCandidate) throw new Error("NO_CANDIDATES");
      const tokens = state.selectedTokenIds;
      if (tokens.length === 0) throw new Error("NO_TOKENS");

      const consentResult = await adapter.setConsent(topCandidate.id, tokens, "grant");
      const mutualResult = await adapter.simulateMutual(topCandidate.id);
      return {
        type: "SET_STEP_DATA",
        payload: {
          currentStep: TUTORIAL_STEPS.STEP5,
          consent: consentResult?.consent ?? null,
          mutual: mutualResult?.mutual ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP6:
      // Step 6: finish — no transition needed, just show actions
      return {
        type: "COMPLETED",
      };

    default:
      throw new Error(`UNKNOWN_STEP: ${step}`);
  }
}

/**
 * Delete all tutorial data via adapter.mutatePrivacy("delete_all")
 */
export async function deleteTutorialData(adapter) {
  const result = await adapter.mutatePrivacy("delete_all", {});
  let round = 0;
  while (result?.complete === false && round < 40) {
    round += 1;
    await adapter.mutatePrivacy("delete_all", {});
  }
  return result;
}
