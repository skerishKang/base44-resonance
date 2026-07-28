export const initialState = Object.freeze({
  status: "idle",
  import: null,
  preview: null,
  events: [],
  tree: null,
  candidates: [],
  consent: null,
  mutual: null,
  matchingEnabled: false,
  error: "",
});

export function watchTreeReducer(state, action) {
  switch (action.type) {
    case "RESTORED":
      return { ...initialState, ...action.payload, status: action.payload?.import ? "ready" : "idle" };
    case "BUSY":
      return { ...state, status: action.status, error: "" };
    case "PREVIEW":
      return { ...state, status: "preview", preview: action.preview, error: "" };
    case "CANCEL_PREVIEW":
      return { ...state, status: state.import ? "ready" : "idle", preview: null, error: "" };
    case "READY":
      return { ...state, ...action.payload, status: "ready", preview: null, error: "" };
    case "MATCHING_DISABLED":
      return { ...state, status: "ready", import: { ...state.import, matching_enabled: false }, matchingEnabled: false, tree: null, candidates: [], consent: null, mutual: null, error: "" };
    case "CONSENT":
      return { ...state, status: "ready", consent: action.consent, mutual: null, error: "" };
    case "CONSENT_REVOKED":
      return { ...state, status: "ready", consent: action.consent, mutual: null, error: "" };
    case "MUTUAL":
      return { ...state, status: "ready", mutual: action.mutual, error: "" };
    case "CLEARED":
      return { ...initialState };
    case "ERROR":
      return { ...state, status: "error", error: action.error };
    default:
      return state;
  }
}
