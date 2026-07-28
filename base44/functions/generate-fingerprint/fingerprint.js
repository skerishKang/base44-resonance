const MEMORY_ORIENTATIONS = ["place_anchored", "moment_anchored", "detail_anchored"];
const CONVERSATIONAL_RHYTHMS = ["measured", "balanced", "lively"];
const CARE_EXPRESSIONS = ["practical", "attentive", "expressive"];
const REQUIRED_SLOT_ORDER = ["vivid_moment", "conversation_condition", "care_expression"];

const SUMMARY_LABELS = {
  en: {
    memory_orientation: {
      place_anchored: "place-shaped memory",
      moment_anchored: "moment-shaped memory",
      detail_anchored: "detail-shaped memory",
    },
    conversational_rhythm: {
      measured: "a measured conversational rhythm",
      balanced: "a balanced conversational rhythm",
      lively: "a lively conversational rhythm",
    },
    care_expression: {
      practical: "practical care",
      attentive: "attentive care",
      expressive: "expressive care",
    },
  },
  ko: {
    memory_orientation: {
      place_anchored: "장소 중심 기억",
      moment_anchored: "순간 중심 기억",
      detail_anchored: "세부 중심 기억",
    },
    conversational_rhythm: {
      measured: "차분한 대화 리듬",
      balanced: "균형 잡힌 대화 리듬",
      lively: "생동감 있는 대화 리듬",
    },
    care_expression: {
      practical: "실질적인 배려",
      attentive: "세심한 배려",
      expressive: "표현하는 배려",
    },
  },
};

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value ?? "").normalize("NFKC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function localizedSummary(fingerprint, locale) {
  const labels = SUMMARY_LABELS[locale === "ko" ? "ko" : "en"];
  const orientation = labels.memory_orientation[fingerprint.memory_orientation];
  const rhythm = labels.conversational_rhythm[fingerprint.conversational_rhythm];
  const care = labels.care_expression[fingerprint.care_expression];
  if (locale === "ko") {
    return `이 데모 해석은 ${orientation}, ${rhythm}, ${care} 신호를 중심으로 구성되었습니다.`.slice(0, 220);
  }
  return `This demo interpretation centers on ${orientation}, ${rhythm}, and ${care}.`.slice(0, 220);
}

export function buildDeterministicFingerprint(memoryCards, locale = "en") {
  const cardsBySlot = new Map(memoryCards.map((card) => [card.slot, card]));
  const ordered = REQUIRED_SLOT_ORDER.map((slot) => cardsBySlot.get(slot));
  const hashes = ordered.map((card) => hashText(`${card.slot}:${card.content}`));
  const aggregate = hashes.reduce((total, value) => (total + value) >>> 0, 0);
  const punctuation = ordered.reduce((total, card) => total + ((String(card.content).match(/[,.!?;:，。！？；：]/g) ?? []).length), 0);
  const wordCount = ordered.reduce((total, card) => total + String(card.content).trim().split(/\s+/).filter(Boolean).length, 0);

  const fingerprint = {
    memory_orientation: MEMORY_ORIENTATIONS[hashes[0] % MEMORY_ORIENTATIONS.length],
    conversational_rhythm: CONVERSATIONAL_RHYTHMS[(hashes[1] + punctuation) % CONVERSATIONAL_RHYTHMS.length],
    care_expression: CARE_EXPRESSIONS[(hashes[2] + wordCount) % CARE_EXPRESSIONS.length],
    novelty_steadiness: clampScore(30 + (aggregate % 61)),
    reflective_intensity: clampScore(35 + ((aggregate >>> 7) % 56)),
    interpretation_version: "deterministic-v1",
    locale: locale === "ko" ? "ko" : "en",
  };

  return {
    ...fingerprint,
    summary: localizedSummary(fingerprint, fingerprint.locale),
  };
}
