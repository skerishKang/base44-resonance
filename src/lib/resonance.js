export const MEMORY_CARD_SLOTS = [
  "vivid_moment",
  "care_expression",
  "conversation_condition",
];

export const MEMORY_MIN_LENGTH = 24;
export const MEMORY_MAX_LENGTH = 420;

export function normalizeMemoryText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, MEMORY_MAX_LENGTH);
}

export function isMemoryTextValid(value) {
  const raw = String(value ?? "");
  if (raw.length > MEMORY_MAX_LENGTH) return false;
  const normalized = normalizeMemoryText(raw);
  return normalized.length >= MEMORY_MIN_LENGTH && normalized.length <= MEMORY_MAX_LENGTH;
}

export function createMutationNonce(cryptoObject = globalThis.crypto) {
  try {
    if (typeof cryptoObject?.randomUUID === "function") {
      return cryptoObject.randomUUID().replaceAll("-", "");
    }
  } catch {
    // Fall through to a bounded non-secret client nonce.
  }
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`.slice(0, 64);
}

export function hasExactlyThreeSavedCards(cards) {
  return MEMORY_CARD_SLOTS.every((slot) => {
    const card = cards?.[slot];
    return Boolean(card?.id) && isMemoryTextValid(card?.content);
  });
}

export function memoryCardIds(cards) {
  return MEMORY_CARD_SLOTS.map((slot) => cards?.[slot]?.id).filter(Boolean);
}

export function isCardSaved(card, savedContent) {
  return Boolean(card?.id) && normalizeMemoryText(card.content) === normalizeMemoryText(savedContent);
}

const CATEGORY_VALUES = {
  place_anchored: 40,
  moment_anchored: 64,
  detail_anchored: 84,
  measured: 38,
  balanced: 62,
  lively: 86,
  practical: 42,
  attentive: 66,
  expressive: 88,
};

export function fingerprintValues(fingerprint) {
  if (!fingerprint) return [0, 0, 0, 0, 0];
  return [
    CATEGORY_VALUES[fingerprint.memory_orientation] ?? 50,
    CATEGORY_VALUES[fingerprint.conversational_rhythm] ?? 50,
    CATEGORY_VALUES[fingerprint.care_expression] ?? 50,
    Number(fingerprint.novelty_steadiness) || 0,
    Number(fingerprint.reflective_intensity) || 0,
  ].map((value) => Math.max(0, Math.min(100, value)));
}

export function fingerprintPolygon(fingerprint, center = 100, radius = 76) {
  return fingerprintValues(fingerprint).map((value, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / 5;
    const scaled = radius * (0.28 + (value / 100) * 0.72);
    const x = center + Math.cos(angle) * scaled;
    const y = center + Math.sin(angle) * scaled;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function deriveJourneyStep({ cards, consent, fingerprint, candidates, decision }) {
  if (!hasExactlyThreeSavedCards(cards)) return "memories";
  if (!consent?.active) return "consent";
  if (!fingerprint) return "fingerprint";
  if (!Array.isArray(candidates) || candidates.length !== 3) return "candidates";
  if (!decision) return "decision";
  return decision.state === "simulated_mutual" ? "mutual" : "waiting";
}
