export const TUTORIAL_STEPS = Object.freeze({
  INACTIVE: -1,
  ENTRY: 0,
  STEP1: 1,
  STEP2: 2,
  STEP3: 3,
  STEP4: 4,
  STEP5: 5,
  STEP6: 6,
  COMPLETED: 7,
  DELETE_COMPLETE: 8,
});

export function createTutorialState() {
  return {
    status: "active",
    currentStep: TUTORIAL_STEPS.ENTRY,
    transitionPending: false,
    error: "",
    events: [],
    tree: null,
    candidates: [],
    consent: null,
    mutual: null,
    importId: null,
    selectedTokenIds: [],
    completedSteps: [],
  };
}

export function createInactiveState() {
  return {
    status: "inactive",
    currentStep: TUTORIAL_STEPS.INACTIVE,
    transitionPending: false,
    error: "",
    events: [],
    tree: null,
    candidates: [],
    consent: null,
    mutual: null,
    importId: null,
    selectedTokenIds: [],
    completedSteps: [],
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
    case "SET_STEP_DATA": {
      const completedSteps = state.completedSteps.includes(action.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, action.currentStep];
      return { ...state, ...action.payload, currentStep: action.currentStep, transitionPending: false, error: "", completedSteps };
    }
    case "SET_ERROR":
      return { ...state, transitionPending: false, error: action.error };
    case "EXIT":
      return createInactiveState();
    case "RESTART":
      return {
        ...state,
        status: "active",
        currentStep: TUTORIAL_STEPS.STEP1,
        transitionPending: false,
        error: "",
      };
    case "COMPLETED":
      return { ...state, status: "completed", currentStep: TUTORIAL_STEPS.COMPLETED, transitionPending: false };
    case "DELETE_COMPLETE":
      return {
        ...createInactiveState(),
        status: "active",
        currentStep: TUTORIAL_STEPS.DELETE_COMPLETE,
      };
    default:
      return state;
  }
}

export async function executeStepTransition(step, adapter, state) {
  switch (step) {
    case TUTORIAL_STEPS.STEP1: {
      if (state.completedSteps.includes(TUTORIAL_STEPS.STEP1) && state.importId) {
        return {
          type: "SET_STEP_DATA",
          currentStep: TUTORIAL_STEPS.STEP1,
          payload: {},
        };
      }
      const result = await adapter.seedDemo();
      const importId = result?.import?.id;
      if (!importId) throw new Error("SEED_FAILED");
      const treeResult = await adapter.buildTree(importId);
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP1,
        payload: {
          importId,
          events: result.events ?? [],
          tree: treeResult?.tree ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP2: {
      if (state.completedSteps.includes(TUTORIAL_STEPS.STEP2) && state.tree) {
        return {
          type: "SET_STEP_DATA",
          currentStep: TUTORIAL_STEPS.STEP2,
          payload: {},
        };
      }
      const restored = await adapter.restore();
      if (!restored?.import) throw new Error("RESTORE_FAILED");
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP2,
        payload: {
          importId: restored.import.id,
          events: restored.events ?? [],
          tree: restored.tree ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP3: {
      if (state.completedSteps.includes(TUTORIAL_STEPS.STEP3) && state.candidates.length > 0) {
        return {
          type: "SET_STEP_DATA",
          currentStep: TUTORIAL_STEPS.STEP3,
          payload: {},
        };
      }
      const importId = state.importId;
      if (!importId) throw new Error("NO_IMPORT");
      const mutation = await adapter.mutatePrivacy("enable_import_matching", { import_id: importId });
      if (!mutation) throw new Error("MATCHING_FAILED");
      const treeResult = await adapter.buildTree(importId);
      const candidateResult = await adapter.findCandidates(treeResult?.tree?.id);
      const candidates = candidateResult?.candidates ?? [];
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP3,
        payload: {
          tree: treeResult?.tree ?? null,
          candidates,
        },
      };
    }

    case TUTORIAL_STEPS.STEP4: {
      if (state.completedSteps.includes(TUTORIAL_STEPS.STEP4) && state.selectedTokenIds.length > 0) {
        return {
          type: "SET_STEP_DATA",
          currentStep: TUTORIAL_STEPS.STEP4,
          payload: {},
        };
      }
      const topCandidate = state.candidates?.[0];
      if (!topCandidate) throw new Error("NO_CANDIDATES");
      const evidenceTokens = (topCandidate.evidence_tokens ?? []).slice(0, 3);
      const tokenIds = evidenceTokens.map((t) => t.id);
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP4,
        payload: {
          selectedTokenIds: tokenIds,
        },
      };
    }

    case TUTORIAL_STEPS.STEP5: {
      if (state.completedSteps.includes(TUTORIAL_STEPS.STEP5) && state.consent && state.mutual) {
        return {
          type: "SET_STEP_DATA",
          currentStep: TUTORIAL_STEPS.STEP5,
          payload: {},
        };
      }
      const topCandidate = state.candidates?.[0];
      if (!topCandidate) throw new Error("NO_CANDIDATES");
      const tokens = state.selectedTokenIds;
      if (tokens.length === 0) throw new Error("NO_TOKENS");

      const consentResult = await adapter.setConsent(topCandidate.id, tokens, "grant");
      const mutualResult = await adapter.simulateMutual(topCandidate.id);
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP5,
        payload: {
          consent: consentResult?.consent ?? null,
          mutual: mutualResult?.mutual ?? null,
        },
      };
    }

    case TUTORIAL_STEPS.STEP6:
      return {
        type: "SET_STEP_DATA",
        currentStep: TUTORIAL_STEPS.STEP6,
        payload: {},
      };

    default:
      throw new Error(`UNKNOWN_STEP: ${step}`);
  }
}

export async function deleteTutorialData(adapter) {
  let result = await adapter.mutatePrivacy("delete_all", {});
  let rounds = 1;

  while (result?.complete === false && rounds < 40) {
    result = await adapter.mutatePrivacy("delete_all", {});
    rounds += 1;
  }

  if (result?.complete === false) {
    throw new Error("DELETE_INCOMPLETE");
  }

  const restored = await adapter.restore();

  if (
    restored.import !== null ||
    restored.events.length !== 0 ||
    restored.tree !== null ||
    restored.candidates.length !== 0 ||
    restored.consent !== null ||
    restored.mutual !== null
  ) {
    throw new Error("DELETE_NOT_EMPTY");
  }

  return restored;
}
