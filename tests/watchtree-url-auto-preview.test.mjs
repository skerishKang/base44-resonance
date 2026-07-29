import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createLatestUrlRequestGate,
  isResolvableYouTubeUrl,
  normalizeYouTubeUrlInput,
} from "../src/watchtree/url-preview.js";

const componentPath = join(import.meta.dirname, "../src/watchtree/WatchTreeExperience.jsx");

test("recognizes supported YouTube URL shapes without accepting arbitrary URLs", () => {
  assert.equal(isResolvableYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isResolvableYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(isResolvableYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ"), true);
  assert.equal(isResolvableYouTubeUrl("https://youtube.com/live/dQw4w9WgXcQ"), true);
  assert.equal(isResolvableYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isResolvableYouTubeUrl("youtube.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(normalizeYouTubeUrlInput("  https://youtu.be/dQw4w9WgXcQ  "), "https://youtu.be/dQw4w9WgXcQ");
});

test("latest-request gate rejects duplicate and stale URL responses", () => {
  const gate = createLatestUrlRequestGate();
  const first = gate.begin("https://youtu.be/first");
  assert.ok(first);
  assert.equal(gate.begin("https://youtu.be/first"), null, "same pending URL must not duplicate lookup");
  assert.equal(gate.isCurrent(first, "https://youtu.be/first"), true);

  gate.invalidate();
  const second = gate.begin("https://youtu.be/second");
  assert.ok(second);
  assert.equal(gate.isCurrent(first, "https://youtu.be/second"), false, "stale response must be rejected");
  assert.equal(gate.isCurrent(second, "https://youtu.be/second"), true);

  gate.settle(second);
  assert.equal(gate.isCurrent(second, "https://youtu.be/second"), false);
});

test("WatchTree URL entry uses automatic preview and one explicit persistence action", () => {
  const source = readFileSync(componentPath, "utf8");
  assert.match(source, /URL_PREVIEW_DEBOUNCE_MS/);
  assert.match(source, /setTimeout\(\(\) => \{\s*void resolveUrl\(trimmed\)/s);
  assert.match(source, /copy\.experience\.addToTree/);
  assert.doesNotMatch(source, /data-testid="url-lookup(?:-inline)?"/);
  assert.doesNotMatch(source, /copy\.experience\.urlLookup/);
  assert.match(source, /if \(state\.urlPreview\?\.sourceUrl === trimmed\) \{\s*void addUrlEvent\(\)/s);
  assert.match(source, /urlRequestGateRef\.current\.invalidate\(\)/);
});
