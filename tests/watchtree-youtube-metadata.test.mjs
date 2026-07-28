import assert from "node:assert/strict";
import test, { after } from "node:test";

const HMAC_TEST_KEY = "test-hmac-key-16ch";
const origDeno = globalThis.Deno;
globalThis.Deno = {
  env: { get: (key) => key === "WATCHTREE_HMAC_KEY" ? HMAC_TEST_KEY : "" },
};

let shared;
try {
  shared = await import("../base44/functions/_shared/watchtree.js");
} catch {
  try {
    shared = await import("../../base44/functions/_shared/watchtree.js");
  } catch {
    shared = null;
  }
}

const it = shared ? test : test.skip;

it("buildYouTubeMetadataResponse transforms valid Google API item", () => {
  const meta = shared.buildYouTubeMetadataResponse({
    id: "AbCdEfGhI01",
    snippet: {
      title: "  Test Video Title  ",
      channelId: "UC_test_channel",
      channelTitle: "Test Creator",
      publishedAt: "2024-01-15T10:00:00.000Z",
      categoryId: "22",
      thumbnails: { medium: { url: "https://example.com/thumb.jpg" } },
    },
    contentDetails: { duration: "PT5M30S" },
    status: { embeddable: true, privacyStatus: "public" },
  });
  assert.equal(meta.video_id, "AbCdEfGhI01");
  assert.equal(meta.canonical_url, "https://www.youtube.com/watch?v=AbCdEfGhI01");
  assert.equal(meta.bounded_title, "Test Video Title");
  assert.equal(meta.channel_id, "UC_test_channel");
  assert.equal(meta.bounded_creator_label, "Test Creator");
  assert.equal(meta.published_at, "2024-01-15T10:00:00.000Z");
  assert.equal(meta.duration_seconds, 330);
  assert.equal(meta.embeddable, true);
  assert.equal(meta.privacy_status, "public");
});

it("buildYouTubeMetadataResponse handles missing fields", () => {
  const meta = shared.buildYouTubeMetadataResponse({
    id: "TestId12345", snippet: {}, contentDetails: {}, status: {},
  });
  assert.equal(meta.video_id, "TestId12345");
  assert.equal(meta.bounded_title, "");
  assert.equal(meta.duration_seconds, null);
});

it("confirmation token roundtrip validates correctly", async () => {
  const metadata = {
    video_id: "AbCdEfGhI01",
    bounded_title: "Test Title",
    bounded_creator_label: "Test Creator",
    duration_seconds: 330,
    published_at: "2024-01-15T10:00:00.000Z",
  };
  const token = await shared.generateConfirmationToken(metadata);
  assert.ok(token.includes("."));
  const valid = await shared.validateConfirmationToken(token, "AbCdEfGhI01");
  assert.ok(valid);
  assert.equal(valid.bounded_title, "Test Title");
});

it("confirmation token rejects wrong video ID", async () => {
  const token = await shared.generateConfirmationToken({
    video_id: "AbCdEfGhI01", bounded_title: "T", bounded_creator_label: "", duration_seconds: null, published_at: "",
  });
  assert.equal(await shared.validateConfirmationToken(token, "WrongIdXXXXX"), null);
});

it("confirmation token rejects tampered payload", async () => {
  const token = await shared.generateConfirmationToken({
    video_id: "AbCdEfGhI01", bounded_title: "T", bounded_creator_label: "", duration_seconds: null, published_at: "",
  });
  const parts = token.split(".");
  const tampered = "tampered." + parts[1];
  assert.equal(await shared.validateConfirmationToken(tampered, "AbCdEfGhI01"), null);
});

it("confirmation token rejects malformed input", async () => {
  assert.equal(await shared.validateConfirmationToken("", "AbCdEfGhI01"), null);
  assert.equal(await shared.validateConfirmationToken("no_dot", "AbCdEfGhI01"), null);
});

it("confirmation token rejects expired token", async () => {
  const expiredPayload = {
    prefix: "yt-confirm-v1",
    video_id: "AbCdEfGhI01",
    bounded_title: "T",
    bounded_creator_label: "",
    duration_seconds: null,
    published_at: "",
    expires_at: Date.now() - 100_000,
  };
  const { stableStringify, digestHex } = shared;
  const payloadJson = stableStringify(expiredPayload);
  const sig = await digestHex(payloadJson);
  const encoder = new TextEncoder();
  const token = `${btoa(String.fromCharCode(...encoder.encode(payloadJson)))}.${btoa(String.fromCharCode(...encoder.encode(sig)))}`;
  assert.equal(await shared.validateConfirmationToken(token, "AbCdEfGhI01"), null);
});

it("parseYouTubeUrl backend variant rejects invalid input", () => {
  assert.equal(shared.parseYouTubeUrl("").error, "URL_REQUIRED");
  assert.equal(shared.parseYouTubeUrl("not a url").error, "URL_INVALID");
});

it("parseYouTubeUrl backend accepts valid watch URL", () => {
  const r = shared.parseYouTubeUrl("https://www.youtube.com/watch?v=AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

it("fetchYouTubeMetadata requires API key", async () => {
  const origDeno2 = globalThis.Deno;
  globalThis.Deno = { env: { get: () => "" } };
  try {
    await assert.rejects(
      () => shared.fetchYouTubeMetadata("AbCdEfGhI01"),
      /YOUTUBE_API_KEY_UNAVAILABLE/,
    );
  } finally {
    globalThis.Deno = origDeno2;
  }
});

after(() => { globalThis.Deno = origDeno; });