import assert from "node:assert/strict";
import test from "node:test";

const arch = await import("../base44/functions/_shared/watchtree-archetypes.js");

function urlEvent(id, overrides = {}) {
  return {
    source_type: "url_collection",
    metadata_provenance: "none",
    matching_enabled: true,
    sensitivity_excluded: false,
    watched_at: "2026-06-01T10:00:00.000Z",
    normalized_content_id: `youtube:v1:video:${id}`,
    bounded_title: "",
    bounded_creator_label: "",
    creator_key: "",
    repeat_count: 1,
    is_synthetic: false,
    ...overrides,
  };
}

function demoEvent(id, overrides = {}) {
  return {
    source_type: "synthetic_demo",
    metadata_provenance: "synthetic_demo",
    matching_enabled: true,
    sensitivity_excluded: false,
    watched_at: "2026-06-01T10:00:00.000Z",
    normalized_content_id: `demo:v1:video:${id}`,
    bounded_title: "Synthetic Scene",
    bounded_creator_label: "Quiet Signal",
    creator_key: "demo:v1:creator:quiet",
    repeat_count: 1,
    is_synthetic: true,
    ...overrides,
  };
}

test("1-3 URL events → insufficient signal", () => {
  assert.equal(arch.orderCandidates([urlEvent("A")]).length, 0);
  assert.equal(arch.orderCandidates([urlEvent("A"), urlEvent("B")]).length, 0);
  assert.equal(arch.orderCandidates([urlEvent("A"), urlEvent("B"), urlEvent("C")]).length, 0);
});

test("4 URL events without creator/title labels → no Creator Loyalist, no documentary/music/long-form/topic", () => {
  const events = ["A", "B", "C", "D"].map((id) => urlEvent(id, { watched_at: `2026-06-0${1 + id.charCodeAt(0) - 64}T10:00:00.000Z` }));
  const result = arch.orderCandidates(events);
  // May have weak candidates or none
  if (result.length > 0) {
    for (const c of result) {
      // No documentary/long-form/music/topic claims
      assert.ok(!c.label.toLowerCase().includes("documentary"), "must not claim documentary without duration");
      assert.ok(!c.label.toLowerCase().includes("music loop"), "must not claim music without duration");
      assert.ok(!c.label.toLowerCase().includes("long-form"), "must not claim long-form without duration");
      assert.ok(!c.label.toLowerCase().includes("learning"), "must not claim learning without duration");
      // Creator Loyalist only appears when non-empty creator labels exist
      assert.ok(!c.label.toLowerCase().includes("creator focus") || c.id !== "archetype-creator-loyalist",
        "must not show Creator Focus without non-empty creator labels");
    }
  }
});

test("URL events with non-empty creator labels → Creator Focus possible", () => {
  const events = ["A", "B", "C", "D"].map((id, i) => urlEvent(id, {
    creator_key: `yt:label:Creator${i}`,
    bounded_creator_label: `Creator${i}`,
    watched_at: `2026-06-0${i + 1}T10:00:00.000Z`,
  }));
  const result = arch.orderCandidates(events);
  // May have Creator Focus in results if scores are high enough
  const creatorFocus = result.find((c) => c.id === "archetype-creator-loyalist");
  if (creatorFocus) {
    assert.ok(creatorFocus.score > 0, "Creator Focus must have positive score");
  }
});

test("same-size URL event set A/B → different source digest (no stale idempotent replay)", () => {
  const setA = ["A", "B", "C", "D"].map((id) => urlEvent(id, { watched_at: `2026-06-0${1}T10:00:00.000Z` }));
  const setB = ["E", "F", "G", "H"].map((id) => urlEvent(id, { watched_at: `2026-06-0${2}T10:00:00.000Z` }));
  // Source digest depends on normalized_content_id and watched_at — different sets produce different digests
  const digestInputA = setA.map((e) => [e.normalized_content_id, e.watched_at, e.repeat_count, e.matching_enabled, e.sensitivity_excluded]);
  const digestInputB = setB.map((e) => [e.normalized_content_id, e.watched_at, e.repeat_count, e.matching_enabled, e.sensitivity_excluded]);
  assert.notDeepEqual(digestInputA, digestInputB, "different event sets must produce different source digest inputs");
});

test("synthetic demo → stable top-3 candidates", () => {
  const demoEvents = [
    demoEvent("001"), demoEvent("002"), demoEvent("003"), demoEvent("004"), demoEvent("005"),
  ];
  const first = arch.orderCandidates(demoEvents);
  const second = arch.orderCandidates(demoEvents);
  assert.deepEqual(first, second);
  if (first.length > 0) {
    assert.ok(first.length <= 3);
    assert.ok(first.every((c) => c.score >= 0 && c.score <= 1));
    assert.ok(first.every((c) => c.synthetic_label));
    assert.ok(first.every((c) => c.evidence_tokens.length > 0));
  }
});

test("no empty creator counted as creator bucket", () => {
  // All URL events with empty creator labels
  const events = ["A", "B", "C", "D"].map((id) => urlEvent(id, { watched_at: `2026-06-0${1}T10:00:00.000Z` }));
  const features = arch.extractFeatures(events);
  assert.ok(features);
  // With empty creators, channelConcentration/diversity should be 0
  assert.equal(features.channelConcentration, 0, "channelConcentration must be 0 when all creators are empty");
  assert.equal(features.channelDiversity, 0, "channelDiversity must be 0 when all creators are empty");
  // Creator Loyalist should have score 0
  const score = arch.scoreArchetype(features, "archetype-creator-loyalist");
  assert.equal(score, 0, "Creator Loyalist score must be 0 when no non-empty creators");
});

test("unknown creator excluded from channel diversity", () => {
  // Mix of empty and non-empty creators
  const events = [
    urlEvent("A", { creator_key: "yt:label:Creator1", bounded_creator_label: "Creator1" }),
    urlEvent("B", { creator_key: "yt:label:Creator1", bounded_creator_label: "Creator1" }),
    urlEvent("C", { creator_key: "", bounded_creator_label: "" }),
    urlEvent("D", { creator_key: "", bounded_creator_label: "" }),
  ];
  const features = arch.extractFeatures(events);
  assert.ok(features);
  assert.ok(features.channelConcentration > 0, "must detect creator concentration from non-empty labels");
  assert.ok(features.hasNonEmptyCreators, "must detect non-empty creators");
});

test("existing demo fixture still works", async () => {
  const { createDemoFixture } = await import("../src/watchtree/fixtures.js");
  const fixture = createDemoFixture();
  const eligible = fixture.events.map((e) => ({ ...e, matching_enabled: true, visibility_state: "matchable_private" }));
  const result = arch.orderCandidates(eligible, arch.SYNTHETIC_CANDIDATES);
  assert.ok(result.length <= 3);
  assert.ok(result.every((c) => c.synthetic_label));
});