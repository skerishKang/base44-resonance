import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNTHETIC_CANDIDATES,
  orderCandidates,
} from "../base44/functions/_shared/watchtree-archetypes.js";

const HANGUL = /[\uAC00-\uD7A3]/u;

function urlEvent(id, creator, day) {
  return {
    source_type: "url_collection",
    metadata_provenance: "user_provided",
    matching_enabled: true,
    sensitivity_excluded: false,
    watched_at: `2026-06-${String(day).padStart(2, "0")}T22:00:00.000Z`,
    normalized_content_id: `youtube:v1:video:${id}`,
    bounded_title: `Video ${id}`,
    bounded_creator_label: creator,
    creator_key: `yt:label:${creator}`,
    repeat_count: 1,
    is_synthetic: false,
  };
}

test("synthetic candidate labels are English-only", () => {
  for (const candidate of SYNTHETIC_CANDIDATES) {
    assert.doesNotMatch(candidate.label, HANGUL);
    assert.doesNotMatch(candidate.synthetic_label, HANGUL);
  }
});

test("grounded URL candidate labels are English-only", () => {
  const candidates = orderCandidates([
    urlEvent("A", "Creator A", 1),
    urlEvent("B", "Creator B", 2),
    urlEvent("C", "Creator C", 3),
    urlEvent("D", "Creator D", 4),
  ]);

  assert.ok(candidates.length > 0);
  for (const candidate of candidates) {
    assert.doesNotMatch(candidate.label, HANGUL);
    assert.doesNotMatch(candidate.synthetic_label, HANGUL);
  }
});
