export const PROBE_LABEL_MIN = 2;
export const PROBE_LABEL_MAX = 48;
export const PROBE_ID_MAX = 128;

export function createClientNonce() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.slice(0, 64);
  return `probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function normalizeProbeLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, PROBE_LABEL_MAX);
}

export function isProbeLabelValid(value) {
  const normalized = normalizeProbeLabel(value);
  return normalized.length >= PROBE_LABEL_MIN && normalized.length <= PROBE_LABEL_MAX;
}

export function isProbeIdValid(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= PROBE_ID_MAX
    && /^[A-Za-z0-9_-]+$/.test(value);
}

export function getCapabilityActions(user) {
  if (!user) return [];
  return ["create-probe", "list-probes", "verify-probe", "logout"];
}

export function createCapabilityState(authState = "checking") {
  return {
    auth: authState,
    entity: authState === "ready" ? "waiting" : "waiting",
    function: "waiting",
  };
}

export function deriveStatusCards(state, labels) {
  return ["auth", "entity", "function"].map((key) => ({
    key,
    label: labels[key],
    state: state[key],
    stateLabel: labels[state[key]],
  }));
}
