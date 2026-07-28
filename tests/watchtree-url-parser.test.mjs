import assert from "node:assert/strict";
import test from "node:test";
import { parseYouTubeUrl, canonicalizeYouTubeUrl, PARSER_ERRORS } from "../src/watchtree/url.js";

test("parseYouTubeUrl accepts standard watch URL", () => {
  const r = parseYouTubeUrl("https://www.youtube.com/watch?v=AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
  assert.equal(r.canonicalUrl, "https://www.youtube.com/watch?v=AbCdEfGhI01");
});

test("parseYouTubeUrl accepts youtu.be short URL", () => {
  const r = parseYouTubeUrl("https://youtu.be/AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl accepts Shorts URL", () => {
  const r = parseYouTubeUrl("https://www.youtube.com/shorts/AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl accepts live URL", () => {
  const r = parseYouTubeUrl("https://www.youtube.com/live/AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl accepts embed URL", () => {
  const r = parseYouTubeUrl("https://www.youtube.com/embed/AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl accepts m.youtube.com URL", () => {
  const r = parseYouTubeUrl("https://m.youtube.com/watch?v=AbCdEfGhI01");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl strips tracking params", () => {
  const r = parseYouTubeUrl("https://youtu.be/AbCdEfGhI01?si=tracking_param&utm_source=test");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
  assert.equal(r.canonicalUrl, "https://www.youtube.com/watch?v=AbCdEfGhI01");
});

test("parseYouTubeUrl strips fragment", () => {
  const r = parseYouTubeUrl("https://www.youtube.com/watch?v=AbCdEfGhI01&t=30#fragment");
  assert.equal(r.error, undefined);
  assert.equal(r.videoId, "AbCdEfGhI01");
});

test("parseYouTubeUrl rejects missing URL", () => {
  assert.equal(parseYouTubeUrl("").error, PARSER_ERRORS.URL_REQUIRED);
});

test("parseYouTubeUrl rejects overlong input", () => {
  assert.equal(parseYouTubeUrl("https://youtu.be/" + "A".repeat(2050)).error, PARSER_ERRORS.URL_TOO_LONG);
});

test("parseYouTubeUrl rejects invalid URL", () => {
  assert.equal(parseYouTubeUrl("not a url").error, PARSER_ERRORS.URL_INVALID);
});

test("parseYouTubeUrl rejects non-http/https protocol", () => {
  assert.equal(parseYouTubeUrl("ftp://youtube.com/watch?v=AbCdEfGhI01").error, PARSER_ERRORS.URL_INVALID);
});

test("parseYouTubeUrl rejects userinfo in URL", () => {
  assert.equal(parseYouTubeUrl("https://user:pass@youtube.com/watch?v=AbCdEfGhI01").error, PARSER_ERRORS.URL_INVALID);
});

test("parseYouTubeUrl rejects fake similar domain", () => {
  assert.equal(parseYouTubeUrl("https://www.youtubee.com/watch?v=AbCdEfGhI01").error, PARSER_ERRORS.YOUTUBE_HOST_UNSUPPORTED);
  assert.equal(parseYouTubeUrl("https://youtube.co/watch?v=AbCdEfGhI01").error, PARSER_ERRORS.YOUTUBE_HOST_UNSUPPORTED);
  assert.equal(parseYouTubeUrl("https://y0utube.com/watch?v=AbCdEfGhI01").error, PARSER_ERRORS.YOUTUBE_HOST_UNSUPPORTED);
});

test("parseYouTubeUrl rejects playlist URLs", () => {
  assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=AbCdEfGhI01&list=PLtest").error, PARSER_ERRORS.PLAYLIST_UNSUPPORTED);
});

test("parseYouTubeUrl rejects channel URLs", () => {
  assert.equal(parseYouTubeUrl("https://www.youtube.com/channel/UCtest").error, PARSER_ERRORS.PLAYLIST_UNSUPPORTED);
  assert.equal(parseYouTubeUrl("https://www.youtube.com/@testchannel").error, PARSER_ERRORS.PLAYLIST_UNSUPPORTED);
  assert.equal(parseYouTubeUrl("https://www.youtube.com/c/testchannel").error, PARSER_ERRORS.PLAYLIST_UNSUPPORTED);
});

test("parseYouTubeUrl rejects search URLs", () => {
  assert.equal(parseYouTubeUrl("https://www.youtube.com/search?q=test").error, PARSER_ERRORS.PLAYLIST_UNSUPPORTED);
});

test("parseYouTubeUrl rejects malformed video ID", () => {
  assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=short").error, PARSER_ERRORS.VIDEO_ID_INVALID);
  assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=invalid_id_$$$").error, PARSER_ERRORS.VIDEO_ID_INVALID);
  assert.equal(parseYouTubeUrl("https://www.youtube.com/shorts/ab").error, PARSER_ERRORS.VIDEO_ID_INVALID);
});

test("canonicalizeYouTubeUrl maintains backward compatibility", () => {
  const r = canonicalizeYouTubeUrl("https://youtu.be/AbCdEfGhI01");
  assert.equal(r.source_platform, "youtube");
  assert.equal(r.normalized_content_id, "AbCdEfGhI01");
  assert.equal(r.canonical_public_url, "https://www.youtube.com/watch?v=AbCdEfGhI01");
});

test("canonicalizeYouTubeUrl returns null for invalid input", () => {
  assert.equal(canonicalizeYouTubeUrl(""), null);
  assert.equal(canonicalizeYouTubeUrl("not a url"), null);
});