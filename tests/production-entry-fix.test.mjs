import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getWatchTreeCopy } from "../src/watchtree/copy.js";
import { getCopy } from "../src/lib/i18n.js";
import { navigateToElementById } from "../src/lib/scroll.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

test("public privacy target is distinct from authenticated privacy controls in both locales", () => {
  const app = read("src/App.jsx");
  const cinematic = read("src/watchtree/CinematicWatchTree.jsx");
  const experience = read("src/watchtree/WatchTreeExperience.jsx");

  assert.match(app, /href="#watchtree-privacy-overview"/);
  assert.match(cinematic, /href="#watchtree-privacy-overview"/);
  assert.match(cinematic, /id="watchtree-privacy-overview"/);
  assert.match(cinematic, /tabIndex="-1"/);
  assert.match(experience, /id="watchtree-privacy"/);
  assert.doesNotMatch(cinematic, /id="watchtree-privacy"/);

  for (const language of ["en", "ko"]) {
    const overview = getWatchTreeCopy(language).landing.privacyOverview;
    assert.ok(overview.title.length > 0, `${language}: privacy title missing`);
    assert.equal(overview.points.length, 6, `${language}: privacy boundary count`);
    const joined = overview.points.join(" ");
    assert.match(joined, /YouTube|YouTube/i);
    assert.match(joined, /synthetic/i);
    assert.match(joined, /real user|실제 사용자/i);
    assert.match(joined, /consent|동의/i);
    assert.match(joined, /delete|삭제/i);
  }
});

test("privacy navigation updates the fragment, scrolls, and focuses the public target", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const scrollCalls = [];
  const focusCalls = [];
  const historyCalls = [];
  const target = {
    scrollIntoView(options) { scrollCalls.push(options); },
    focus(options) { focusCalls.push(options); },
  };

  globalThis.window = {
    location: { pathname: "/", search: "?preview=1", hash: "" },
    history: { pushState(_state, _title, url) { historyCalls.push(url); } },
  };
  globalThis.document = {
    getElementById(id) { return id === "watchtree-privacy-overview" ? target : null; },
  };

  try {
    assert.equal(navigateToElementById("watchtree-privacy-overview", { block: "start" }), true);
    assert.deepEqual(historyCalls, ["/?preview=1#watchtree-privacy-overview"]);
    assert.deepEqual(scrollCalls, [{ behavior: "auto", block: "start" }]);
    assert.deepEqual(focusCalls, [{ preventScroll: true }]);
    assert.equal(navigateToElementById("missing-target"), false);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Google provider action is bounded, localized, and absent from OTP mode", () => {
  const authPanel = read("src/components/AuthPanel.jsx");
  const en = getCopy("en").auth;
  const ko = getCopy("ko").auth;

  assert.equal(en.google, "Continue with Google");
  assert.equal(en.orEmail, "Or continue with email");
  assert.equal(ko.google, "Google로 계속하기");
  assert.equal(ko.orEmail, "또는 이메일로 계속하기");
  assert.match(authPanel, /mode !== "verify"/);
  assert.match(authPanel, /base44\.auth\.loginWithProvider\("google", getSafeAuthReturnUrl\(\)\)/);
  assert.match(authPanel, /return `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}\$\{window\.location\.hash\}`/);
  assert.match(authPanel, /providerBusyRef\.current/);
  assert.match(authPanel, /auth-provider-divider/);
  assert.match(authPanel, /type="button"/);
  assert.match(authPanel, /copy\.auth\.errors\.provider/);
  assert.doesNotMatch(authPanel, /console\./);
  assert.doesNotMatch(authPanel, /error\.message/);
});
