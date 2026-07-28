export const WATCHTREE_VERSIONS = Object.freeze({
  fixture: "watchtree-demo-v1",
  corpus: "demo-corpus-v1",
  normalization: "yt-takeout-v1",
  matching: "watchtree-match-v1",
  schema: 1,
});

export const LIMITS = Object.freeze({
  maxFileBytes: 8_388_608,
  maxRecords: 5_000,
  maxJsonDepth: 16,
  maxHtmlNodes: 100_000,
  parseBudgetMs: 8_000,
  title: 240,
  creator: 160,
  url: 512,
  ownerNote: 500,
  maxRejected: 250,
  errorSamples: 20,
  requestBytes: 196_608,
  batch: 100,
  minChunk: 25,
  maxChunk: 200,
});

export const EVIDENCE_TYPES = Object.freeze([
  "exact",
  "rare",
  "path",
  "difference",
]);

export const SOURCE_TYPES = Object.freeze([
  "synthetic_demo",
  "google_takeout_json",
  "google_takeout_html",
]);

export const VISIBILITY = Object.freeze({
  ownerOnly: "owner_only",
  matchable: "matchable_private",
  revealSelected: "reveal_selected",
});

export const SCORE_WEIGHTS = Object.freeze({
  exact: 0.25,
  rarity: 0.25,
  repeated: 0.15,
  sequence: 0.15,
  creator: 0.08,
  temporal: 0.07,
  difference: 0.05,
});
