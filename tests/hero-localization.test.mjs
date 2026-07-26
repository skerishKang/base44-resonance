import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  getCopy,
  getStoredLanguage,
  persistLanguage,
} from "../src/lib/i18n.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");
const removedSentence = [
  "조건이 아니라,",
  " 느끼고 기억하는 방식으로 연결됩니다.",
].join("");

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

test("English hero contains English product copy only", () => {
  const hero = getCopy("en").hero;
  assert.equal(Object.hasOwn(hero, "koreanLine"), false);
  assert.equal(Object.values(hero).some((value) => (
    typeof value === "string" && value.includes(removedSentence)
  )), false);
  assert.match(hero.title, /Connect through the way you feel and remember/);
  assert.match(hero.body, /private memories, explicit consent/);

  const app = read("src/App.jsx");
  const i18n = read("src/lib/i18n.js");
  assert.doesNotMatch(app, /hero__korean-line|hero\.koreanLine/);
  assert.doesNotMatch(i18n, /koreanLine/);
  assert.equal(app.includes(removedSentence), false);
  assert.equal(i18n.includes(removedSentence), false);
});

test("Korean locale keeps its coherent hero title and body", () => {
  const hero = getCopy("ko").hero;
  assert.equal(Object.hasOwn(hero, "koreanLine"), false);
  assert.match(hero.title, /느끼고 기억하는 방식으로 연결됩니다/);
  assert.match(hero.body, /사적인 기억과 명시적 동의/);
  assert.equal(hero.primary, "공명 시작");
});

test("locale persistence and document language switching remain intact", () => {
  const storage = createStorage();
  assert.equal(getStoredLanguage(storage), "en");
  assert.equal(persistLanguage("ko", storage), "ko");
  assert.equal(getStoredLanguage(storage), "ko");

  const app = read("src/App.jsx");
  assert.match(
    app,
    /document\.documentElement\.lang = language === "ko" \? "ko" : "en"/,
  );
});

test("orphaned hero subline CSS is removed without changing mobile CTA contracts", () => {
  const app = read("src/App.jsx");
  const css = read("src/index.css");
  const productCss = read("src/product.css");

  assert.doesNotMatch(css, /hero__korean-line/);
  assert.doesNotMatch(productCss, /hero__korean-line/);
  assert.match(app, /data-primary-cta="resonance"/);
  assert.match(css, /@media \(max-width: 540px\)/);
  assert.match(css, /\.hero__actions \{ display: grid; \}/);
  assert.match(css, /\.button \{ width: 100%; \}/);
  assert.match(productCss, /data-primary-cta="resonance"/);
});

test("unrelated Auth, journey, and backend copy contracts remain unchanged", () => {
  const en = getCopy("en");
  const ko = getCopy("ko");

  assert.equal(en.auth.title, "Begin with a protected identity.");
  assert.equal(en.journey.title, "Build a signal that explains itself.");
  assert.equal(en.backend.foundation, "Slice 2 product path");
  assert.equal(ko.auth.title, "보호된 신원에서 시작합니다.");
  assert.equal(ko.journey.title, "스스로 설명되는 공명 신호를 만듭니다.");
  assert.equal(ko.backend.foundation, "Slice 2 제품 경로");
});
