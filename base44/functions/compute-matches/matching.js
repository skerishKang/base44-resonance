const PROFILES = [
  {
    id: "sol",
    name: "Sol",
    memory_orientation: "moment_anchored",
    conversational_rhythm: "measured",
    care_expression: "attentive",
    novelty_steadiness: 52,
    reflective_intensity: 78,
  },
  {
    id: "mira",
    name: "Mira",
    memory_orientation: "place_anchored",
    conversational_rhythm: "lively",
    care_expression: "expressive",
    novelty_steadiness: 76,
    reflective_intensity: 61,
  },
  {
    id: "jun",
    name: "Jun",
    memory_orientation: "detail_anchored",
    conversational_rhythm: "balanced",
    care_expression: "practical",
    novelty_steadiness: 41,
    reflective_intensity: 69,
  },
];

const LABELS = {
  en: {
    synthetic: "Synthetic demo profile",
    orientation: {
      place_anchored: "place-shaped memory",
      moment_anchored: "moment-shaped memory",
      detail_anchored: "detail-shaped memory",
    },
    rhythm: {
      measured: "measured conversation",
      balanced: "balanced conversational pace",
      lively: "lively conversational energy",
    },
    care: {
      practical: "practical care",
      attentive: "attentive care",
      expressive: "expressive care",
    },
    novelty: "novelty and steadiness balance",
    reflection: "reflective intensity",
    difference: "A different pace may create useful contrast.",
    reason: "The shared signals suggest a conversation could feel legible while the contrast leaves room for discovery.",
  },
  ko: {
    synthetic: "합성 데모 프로필",
    orientation: {
      place_anchored: "장소 중심 기억",
      moment_anchored: "순간 중심 기억",
      detail_anchored: "세부 중심 기억",
    },
    rhythm: {
      measured: "차분한 대화 리듬",
      balanced: "균형 잡힌 대화 속도",
      lively: "생동감 있는 대화 에너지",
    },
    care: {
      practical: "실질적인 배려",
      attentive: "세심한 배려",
      expressive: "표현하는 배려",
    },
    novelty: "새로움과 안정감의 균형",
    reflection: "성찰 강도",
    difference: "서로 다른 속도가 의미 있는 대비를 만들 수 있습니다.",
    reason: "공통 신호는 대화를 이해하기 쉽게 만들고, 차이는 새로운 발견의 여지를 남깁니다.",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function closeness(left, right) {
  return Math.max(0, 10 - Math.round(Math.abs(Number(left) - Number(right)) / 7));
}

function scoreProfile(fingerprint, profile) {
  let score = 54;
  if (fingerprint.memory_orientation === profile.memory_orientation) score += 9;
  if (fingerprint.conversational_rhythm === profile.conversational_rhythm) score += 9;
  if (fingerprint.care_expression === profile.care_expression) score += 9;
  score += closeness(fingerprint.novelty_steadiness, profile.novelty_steadiness);
  score += closeness(fingerprint.reflective_intensity, profile.reflective_intensity);
  return clamp(score, 58, 94);
}

function sharedSignals(fingerprint, profile, labels) {
  const signals = [];
  if (fingerprint.memory_orientation === profile.memory_orientation) {
    signals.push(labels.orientation[profile.memory_orientation]);
  }
  if (fingerprint.conversational_rhythm === profile.conversational_rhythm) {
    signals.push(labels.rhythm[profile.conversational_rhythm]);
  }
  if (fingerprint.care_expression === profile.care_expression) {
    signals.push(labels.care[profile.care_expression]);
  }
  if (Math.abs(Number(fingerprint.novelty_steadiness) - profile.novelty_steadiness) <= 18) {
    signals.push(labels.novelty);
  }
  if (Math.abs(Number(fingerprint.reflective_intensity) - profile.reflective_intensity) <= 18) {
    signals.push(labels.reflection);
  }

  const fallback = [
    labels.rhythm[profile.conversational_rhythm],
    labels.care[profile.care_expression],
    labels.orientation[profile.memory_orientation],
  ];
  for (const item of fallback) {
    if (signals.length >= 3) break;
    if (!signals.includes(item)) signals.push(item);
  }
  return signals.slice(0, 3);
}

function differenceFor(fingerprint, profile, labels) {
  if (fingerprint.conversational_rhythm !== profile.conversational_rhythm) {
    return `${labels.rhythm[fingerprint.conversational_rhythm]} ↔ ${labels.rhythm[profile.conversational_rhythm]}`.slice(0, 120);
  }
  if (fingerprint.care_expression !== profile.care_expression) {
    return `${labels.care[fingerprint.care_expression]} ↔ ${labels.care[profile.care_expression]}`.slice(0, 120);
  }
  return labels.difference.slice(0, 120);
}

export function computeDeterministicMatches(fingerprint, locale = "en") {
  const normalizedLocale = locale === "ko" ? "ko" : "en";
  const labels = LABELS[normalizedLocale];

  return PROFILES.map((profile) => {
    const score = scoreProfile(fingerprint, profile);
    return {
      id: profile.id,
      name: profile.name,
      synthetic_label: labels.synthetic,
      score,
      tier: score >= 82 ? "high" : score >= 70 ? "promising" : "exploratory",
      shared_signals: sharedSignals(fingerprint, profile, labels),
      difference: differenceFor(fingerprint, profile, labels),
      explanation: labels.reason.slice(0, 220),
    };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
