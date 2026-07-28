import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectedEvidenceTokensForCandidate } from "../src/watchtree/matching.js";

const candidateA = {
  id: "6a68604f-row-a",
  candidate_ref_opaque: "synthetic:viewer-b:demo-corpus-v1",
  evidence_tokens: [
    { id: "viewer-b:exact", type: "exact", count: 4 },
    { id: "viewer-b:path", type: "path", count: 1 },
  ],
};

const candidateB = {
  id: "6a686050-row-b",
  candidate_ref_opaque: "synthetic:viewer-c:demo-corpus-v1",
  evidence_tokens: [
    { id: "viewer-c:exact", type: "exact", count: 3 },
    { id: "viewer-c:rare", type: "rare", count: 1 },
  ],
};

const revealEnabled = (candidate, selectedTokens) =>
  selectedEvidenceTokensForCandidate(candidate, selectedTokens).length > 0;

test("zero selected tokens keeps reveal disabled for every candidate and yields no payload", () => {
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateA, []), []);
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateB, []), []);
  assert.equal(revealEnabled(candidateA, []), false);
  assert.equal(revealEnabled(candidateB, []), false);
});

test("selecting a viewer-b token enables only candidate A", () => {
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateA, ["viewer-b:exact"]), ["viewer-b:exact"]);
  assert.equal(revealEnabled(candidateA, ["viewer-b:exact"]), true);
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateB, ["viewer-b:exact"]), []);
  assert.equal(revealEnabled(candidateB, ["viewer-b:exact"]), false);
});

test("mixed selection filters candidate A payload to exactly its own evidence token", () => {
  const mixed = ["viewer-b:exact", "viewer-c:rare", "unknown:token"];
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateA, mixed), ["viewer-b:exact"]);
});

test("candidate B tokens never enable candidate A", () => {
  const bOnly = ["viewer-c:exact", "viewer-c:rare"];
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateA, bOnly), []);
  assert.equal(revealEnabled(candidateA, bOnly), false);
  assert.deepEqual(selectedEvidenceTokensForCandidate(candidateB, bOnly), ["viewer-c:exact", "viewer-c:rare"]);
});

test("malformed evidence token objects are ignored in the allowlist", () => {
  const malformed = {
    id: "6a686051-row-c",
    evidence_tokens: [
      null,
      undefined,
      { type: "exact", count: 1 },
      { id: "", type: "rare", count: 1 },
      { id: 123, type: "path", count: 1 },
      { id: "viewer-d:exact", type: "exact", count: 2 },
    ],
  };
  assert.deepEqual(
    selectedEvidenceTokensForCandidate(malformed, ["viewer-d:exact", null, 42, "viewer-d:rare", ""]),
    ["viewer-d:exact"],
  );
});

test("duplicate selected tokens are de-duplicated in the payload", () => {
  assert.deepEqual(
    selectedEvidenceTokensForCandidate(candidateA, ["viewer-b:exact", "viewer-b:exact", "viewer-b:path", "viewer-b:exact"]),
    ["viewer-b:exact", "viewer-b:path"],
  );
});

test("entity row ID prefix is never treated as token ownership", () => {
  assert.deepEqual(
    selectedEvidenceTokensForCandidate(candidateA, [`${candidateA.id}:exact`, "viewer-b:exact"]),
    ["viewer-b:exact"],
  );
});

test("no payload ever carries another candidate's token", () => {
  const universe = ["viewer-b:exact", "viewer-b:path", "viewer-c:exact", "viewer-c:rare", "unknown:token", candidateA.id, candidateB.id];
  const payloadA = selectedEvidenceTokensForCandidate(candidateA, universe);
  const payloadB = selectedEvidenceTokensForCandidate(candidateB, universe);
  assert.deepEqual(payloadA, ["viewer-b:exact", "viewer-b:path"]);
  assert.deepEqual(payloadB, ["viewer-c:exact", "viewer-c:rare"]);
  for (const id of payloadA) assert.ok(id.startsWith("viewer-b:"), `candidate A payload leaks foreign token ${id}`);
  for (const id of payloadB) assert.ok(id.startsWith("viewer-c:"), `candidate B payload leaks foreign token ${id}`);
});

test("reveal button and consent payload both derive from the evidence-token allowlist", () => {
  const source = readFileSync(fileURLToPath(new URL("../src/watchtree/WatchTreeExperience.jsx", import.meta.url)), "utf8");
  assert.match(source, /import \{ selectedEvidenceTokensForCandidate \} from "\.\/matching\.js"/);
  assert.match(source, /disabled=\{selectedEvidenceTokensForCandidate\(candidate, selectedTokens\)\.length === 0\}/);
  assert.match(source, /const candidateTokens = selectedEvidenceTokensForCandidate\(candidate, selectedTokens\)/);
  assert.match(source, /if \(candidateTokens\.length === 0\) return;/);
  assert.match(source, /adapter\.setConsent\(candidate\.id, candidateTokens, "grant"\)/);
  assert.doesNotMatch(source, /startsWith\(`\$\{candidate\.id\}/);
});
