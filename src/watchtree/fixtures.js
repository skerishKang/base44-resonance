import { VISIBILITY, WATCHTREE_VERSIONS } from "./constants.js";

const CREATOR_LABELS = Object.freeze({
  quiet: "Quiet Signal",
  ember: "Studio Ember",
  night: "Night Archive",
  field: "Field Notes",
  long: "Long Light",
  small: "Small Frame",
});

const pad = (value) => String(value).padStart(3, "0");
const contentId = (index) => `demo:v1:video:${pad(index)}`;

function rawEvent({ index, at, creator = "quiet", candidate = false }) {
  return {
    source_platform: "synthetic_demo",
    source_type: "synthetic_demo",
    normalized_content_id: contentId(index),
    bounded_title: `Synthetic Scene ${pad(index)}`,
    bounded_creator_label: `${CREATOR_LABELS[creator]} ${String((index % 18) + 1).padStart(2, "0")}`,
    canonical_public_url: "",
    watched_at: new Date(at).toISOString(),
    repeat_count: 1,
    first_watched_at: new Date(at).toISOString(),
    last_watched_at: new Date(at).toISOString(),
    occurrence_index: 1,
    same_second_ordinal: 0,
    visibility_state: candidate ? VISIBILITY.matchable : VISIBILITY.ownerOnly,
    matching_enabled: candidate,
    sensitivity_excluded: false,
    optional_owner_note: "",
    normalization_version: "demo-v1",
    canonicalization_version: "demo-content-v1",
    schema_version: 1,
    is_synthetic: true,
    fixture_id: WATCHTREE_VERSIONS.fixture,
    creator_key: `demo:v1:creator:${creator}`,
  };
}

function decorateRepeats(events) {
  const groups = new Map();
  for (const event of events) {
    const group = groups.get(event.normalized_content_id) ?? [];
    group.push(event);
    groups.set(event.normalized_content_id, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.watched_at.localeCompare(b.watched_at));
    group.forEach((event, index) => {
      event.repeat_count = group.length;
      event.first_watched_at = group[0].watched_at;
      event.last_watched_at = group.at(-1).watched_at;
      event.occurrence_index = index + 1;
    });
  }
  return events.sort((a, b) => a.watched_at.localeCompare(b.watched_at));
}

function time(day, hour = 20, minute = 0) {
  return Date.UTC(2026, 3, day, hour, minute);
}

export function createDemoEventsA() {
  const events = [];
  const creatorFor = (id) => id <= 10 ? "quiet" : id <= 17 ? "ember" : id <= 23 ? "night" : "field";

  for (let id = 1; id <= 30; id += 1) {
    const at = id === 3 ? time(7, 19) : id === 4 ? time(7, 20) : id === 5 ? time(7, 21) : time(1 + id * 2, 8 + (id % 12), (id * 7) % 60);
    events.push(rawEvent({ index: id, at, creator: creatorFor(id) }));
  }

  const revisits = [1, 2, 3, 4, 1, 2, 3, 4, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26];
  revisits.forEach((id, offset) => events.push(rawEvent({
    index: id,
    at: time(63 + offset, 18 + (offset % 5), (offset * 11) % 60),
    creator: creatorFor(id),
  })));

  return decorateRepeats(events).slice(0, 48);
}

function createCandidate({ id, label, syntheticLabel, exactIds, repeatedIds, uniqueStart, creatorShift = 0, path = [] }) {
  const events = [];
  exactIds.forEach((content, index) => {
    const pathIndex = path.indexOf(content);
    const at = pathIndex >= 0 ? time(8, 19 + pathIndex) : time(2 + index * 3, 9 + (index % 10));
    events.push(rawEvent({ index: content, at, creator: content <= 10 ? "quiet" : "ember", candidate: true }));
  });
  repeatedIds.forEach((content, index) => events.push(rawEvent({
    index: content,
    at: time(65 + index, 20),
    creator: content <= 10 ? "quiet" : "ember",
    candidate: true,
  })));

  let next = uniqueStart;
  while (events.length < 46) {
    const creator = next % 4 === creatorShift % 4 ? "quiet" : ["ember", "night", "field", "long", "small"][(next + creatorShift) % 5];
    events.push(rawEvent({ index: next, at: time(3 + (events.length % 82), 7 + (events.length % 15)), creator, candidate: true }));
    next += 1;
    if (next > 80) next = uniqueStart;
  }
  return { id, label, synthetic_label: syntheticLabel, events: decorateRepeats(events.slice(0, 46)) };
}

export const SYNTHETIC_CANDIDATES = Object.freeze([
  createCandidate({
    id: "viewer-b",
    label: "Viewer B · Same quiet arc",
    syntheticLabel: "Synthetic viewer · competition demo",
    exactIds: [1, 2, 3, 4, 5, 6, 7, 8],
    repeatedIds: [1, 2, 3, 4],
    uniqueStart: 31,
    creatorShift: 0,
    path: [3, 4, 5],
  }),
  createCandidate({
    id: "viewer-c",
    label: "Viewer C · Repeated night path",
    syntheticLabel: "Synthetic viewer · competition demo",
    exactIds: [2, 3, 4, 5, 9, 12],
    repeatedIds: [2, 3],
    uniqueStart: 45,
    creatorShift: 2,
    path: [3, 4, 5],
  }),
  createCandidate({
    id: "viewer-d",
    label: "Viewer D · Adjacent creator trail",
    syntheticLabel: "Synthetic viewer · competition demo",
    exactIds: [1, 3, 9, 11],
    repeatedIds: [1],
    uniqueStart: 58,
    creatorShift: 4,
    path: [],
  }),
  createCandidate({
    id: "archetype-quiet-rewatcher",
    label: "Quiet Rewatcher · 조용한 반복 감상자",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [1, 2, 3, 4, 5, 6],
    repeatedIds: [1, 1, 2, 2, 3, 4],
    uniqueStart: 31,
    creatorShift: 0,
    path: [1, 2, 3],
  }),
  createCandidate({
    id: "archetype-night-documentary",
    label: "Night Documentary Explorer · 심야 다큐 탐험가",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [7, 8, 9, 10, 11, 12],
    repeatedIds: [9, 10],
    uniqueStart: 35,
    creatorShift: 1,
    path: [9, 10, 11],
  }),
  createCandidate({
    id: "archetype-learning-trail",
    label: "Learning Trail Builder · 학습 경로 수집가",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [13, 14, 15, 16, 17, 18],
    repeatedIds: [14, 16],
    uniqueStart: 40,
    creatorShift: 2,
    path: [14, 15, 16],
  }),
  createCandidate({
    id: "archetype-music-loop",
    label: "Music Loop Listener · 음악 반복 청취자",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [3, 4, 8, 9, 12],
    repeatedIds: [3, 3, 4, 4, 8, 9],
    uniqueStart: 44,
    creatorShift: 3,
    path: [],
  }),
  createCandidate({
    id: "archetype-longform-cinema",
    label: "Long-form Cinema Viewer · 장편 영상 감상자",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [19, 20, 21, 22, 23, 24],
    repeatedIds: [20, 22],
    uniqueStart: 50,
    creatorShift: 0,
    path: [20, 21, 22],
  }),
  createCandidate({
    id: "archetype-creator-loyalist",
    label: "Creator Loyalist · 특정 크리에이터 집중형",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [1, 2, 3, 6, 7, 8, 25],
    repeatedIds: [1, 2, 3],
    uniqueStart: 55,
    creatorShift: 0,
    path: [1, 2, 3],
  }),
  createCandidate({
    id: "archetype-rabbit-hole",
    label: "Topic Rabbit-hole Explorer · 연관 주제 탐험형",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [10, 11, 12, 13, 14, 15],
    repeatedIds: [12, 14],
    uniqueStart: 60,
    creatorShift: 1,
    path: [12, 13, 14],
  }),
  createCandidate({
    id: "archetype-eclectic-wanderer",
    label: "Eclectic Wanderer · 다양한 주제 유랑형",
    syntheticLabel: "Synthetic archetype · 시청 유형",
    exactIds: [5, 11, 17, 23, 29],
    repeatedIds: [],
    uniqueStart: 65,
    creatorShift: 4,
    path: [],
  }),
]);

export function createDemoFixture() {
  return {
    fixture_id: WATCHTREE_VERSIONS.fixture,
    corpus_version: WATCHTREE_VERSIONS.corpus,
    events: createDemoEventsA(),
    candidates: SYNTHETIC_CANDIDATES,
  };
}