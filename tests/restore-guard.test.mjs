import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

test("journey mutation surfaces are removed from interaction while durable state restores", () => {
  const journey = read("src/components/ResonanceJourney.jsx");
  const guard = read("src/restore-guard.css");
  const main = read("src/main.jsx");
  assert.match(journey, /isRestoring \? \([\s\S]*state-message--loading[\s\S]*restoreStatus !== "error" \? <div className="journey-grid">/);
  assert.match(guard, /> \.state-message--loading \+ \.journey-grid[\s\S]*display: none/);
  assert.match(main, /import "@\/restore-guard\.css"/);
});
