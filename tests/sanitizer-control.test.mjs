import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Import the shared production sanitizer (same module used by backend functions)
const sanitizerUrl = new URL("../base44/functions/_shared/sanitizer.js", import.meta.url);

let sanitizeResponse, INTERNAL_FIELDS, publicEvent;
try {
  const mod = await import(sanitizerUrl);
  sanitizeResponse = mod.sanitizeResponse;
  INTERNAL_FIELDS = mod.INTERNAL_FIELDS;
  publicEvent = mod.publicEvent;
} catch (err) {
  // Fallback: if direct import fails (e.g. in environments without module resolution),
  // eval the file content (export-free) as in the browser test
  const code = (await readFile(fileURLToPath(sanitizerUrl), "utf8")).replace(/^export /gm, "");
  const fn = new Function(`${code}; return { INTERNAL_FIELDS, sanitizeResponse, publicEvent };`);
  const exports = fn();
  sanitizeResponse = exports.sanitizeResponse;
  INTERNAL_FIELDS = exports.INTERNAL_FIELDS;
  publicEvent = exports.publicEvent;
}

const FORBIDDEN = ["match_hash", "source_record_fingerprint", "input_digest", "source_digest", "client_nonce_digest", "payload_digest"];

// Raw fixture matching the browser test structure
const rawFixture = {
  ok: true,
  event: {
    id: "synthetic-event-1",
    title: "Synthetic title",
    match_hash: "synthetic-match-value",
    client_nonce_digest: "abc123",
    payload_digest: "def456",
    nested: {
      source_record_fingerprint: "synthetic-record-value",
    },
  },
  records: [
    {
      id: "synthetic-record-1",
      input_digest: "synthetic-input-value",
    },
    {
      id: "synthetic-record-2",
      metadata: {
        source_digest: "synthetic-source-value",
      },
    },
  ],
};

// Helper: deep clone via JSON round-trip
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// Helper: recursive scanner (mirrors browser scanner)
function scanForbidden(obj, counts = { match_hash: 0, source_record_fingerprint: 0, input_digest: 0, source_digest: 0, client_nonce_digest: 0, payload_digest: 0 }) {
  if (!obj || typeof obj !== "object") return counts;
  if (Array.isArray(obj)) { obj.forEach((item) => scanForbidden(item, counts)); return counts; }
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN.includes(key)) counts[key] += 1;
    scanForbidden(obj[key], counts);
  }
  return counts;
}

// ===== Test: publicEvent wraps sanitizeResponse =====
{
  const result = publicEvent(rawFixture);
  const rawResult = scanForbidden(rawFixture);
  const sanitizedResult = scanForbidden(result);
  assert.equal(typeof sanitizeResponse, "function", "sanitizeResponse must be a function");
  assert.equal(typeof publicEvent, "function", "publicEvent must be a function");
  assert.ok(INTERNAL_FIELDS instanceof Set, "INTERNAL_FIELDS must be a Set");
  assert.equal(INTERNAL_FIELDS.size, 6, "INTERNAL_FIELDS must contain exactly 6 items");
  assert.equal(rawResult.match_hash, 1, "raw fixture must contain match_hash");
  assert.equal(rawResult.source_record_fingerprint, 1, "raw fixture must contain source_record_fingerprint");
  assert.equal(rawResult.input_digest, 1, "raw fixture must contain input_digest");
  assert.equal(rawResult.source_digest, 1, "raw fixture must contain source_digest");
  assert.equal(rawResult.client_nonce_digest, 1, "raw fixture must contain client_nonce_digest");
  assert.equal(rawResult.payload_digest, 1, "raw fixture must contain payload_digest");
  assert.equal(sanitizedResult.match_hash, 0, "publicEvent must remove match_hash");
  assert.equal(sanitizedResult.source_record_fingerprint, 0, "publicEvent must remove source_record_fingerprint");
  assert.equal(sanitizedResult.input_digest, 0, "publicEvent must remove input_digest");
  assert.equal(sanitizedResult.source_digest, 0, "publicEvent must remove source_digest");
  assert.equal(sanitizedResult.client_nonce_digest, 0, "publicEvent must remove client_nonce_digest");
  assert.equal(sanitizedResult.payload_digest, 0, "publicEvent must remove payload_digest");
}

// ===== Test: sanitizeResponse positive control =====
{
  const rawScan = scanForbidden(rawFixture);
  assert.equal(rawScan.match_hash, 1, "positive control: match_hash must be detected");
  assert.equal(rawScan.source_record_fingerprint, 1, "positive control: source_record_fingerprint must be detected");
  assert.equal(rawScan.input_digest, 1, "positive control: input_digest must be detected");
  assert.equal(rawScan.source_digest, 1, "positive control: source_digest must be detected");
}

// ===== Test: sanitizeResponse recursively removes all forbidden fields =====
{
  const sanitized = sanitizeResponse(clone(rawFixture));
  const sanitizedScan = scanForbidden(sanitized);
  assert.equal(sanitizedScan.match_hash, 0, "sanitized: match_hash must be removed");
  assert.equal(sanitizedScan.source_record_fingerprint, 0, "sanitized: source_record_fingerprint must be removed");
  assert.equal(sanitizedScan.input_digest, 0, "sanitized: input_digest must be removed");
  assert.equal(sanitizedScan.source_digest, 0, "sanitized: source_digest must be removed");
}

// ===== Test: allowed fields preserved =====
{
  const sanitized = sanitizeResponse(clone(rawFixture));
  assert.equal(sanitized.ok, true, "ok must be preserved");
  assert.equal(sanitized.event.id, "synthetic-event-1", "event.id must be preserved");
  assert.equal(sanitized.event.title, "Synthetic title", "event.title must be preserved");
  assert.equal(sanitized.records[0].id, "synthetic-record-1", "records[0].id must be preserved");
  assert.equal(sanitized.records[1].id, "synthetic-record-2", "records[1].id must be preserved");
  assert.ok(sanitized.records[1].metadata, "records[1].metadata must be preserved");
  // Forbidden fields must be absent
  assert.equal(sanitized.event.match_hash, undefined, "event.match_hash must be undefined");
  assert.equal(sanitized.event.nested?.source_record_fingerprint, undefined, "nested source_record_fingerprint must be undefined");
  assert.equal(sanitized.records[0].input_digest, undefined, "records[0].input_digest must be undefined");
  assert.equal(sanitized.records[1].metadata?.source_digest, undefined, "metadata source_digest must be undefined");
}

// ===== Test: input mutation contract =====
{
  const original = clone(rawFixture);
  const sanitized = sanitizeResponse(original);
  // sanitizeResponse creates a new object; verify original is unchanged
  assert.deepEqual(original, rawFixture, "original fixture must not be mutated");
}

// ===== Test: serialized form =====
{
  const rawSerialized = JSON.stringify(rawFixture);
  const sanitized = sanitizeResponse(clone(rawFixture));
  const sanitizedSerialized = JSON.stringify(sanitized);

  // Raw serialized must contain forbidden fields
  for (const field of FORBIDDEN) {
    assert.ok(rawSerialized.includes(field), `raw serialized must include ${field}`);
  }

  // Sanitized serialized must NOT contain forbidden fields
  for (const field of FORBIDDEN) {
    assert.equal(sanitizedSerialized.includes(field), false, `sanitized serialized must not include ${field}`);
  }

  // Sanitized serialized must be parseable
  const parsed = JSON.parse(sanitizedSerialized);
  assert.equal(parsed.ok, true, "parsed sanitized must have ok=true");
  assert.equal(parsed.event.id, "synthetic-event-1", "parsed sanitized must retain event.id");
  assert.equal(parsed.records[0].id, "synthetic-record-1", "parsed sanitized must retain records[0].id");
}

// ===== Test: nested arrays =====
{
  const arrayFixture = {
    items: [
      { name: "item1", match_hash: "hash1" },
      { name: "item2", source_record_fingerprint: "fp2" },
    ],
  };
  const sanitized = sanitizeResponse(arrayFixture);
  assert.equal(sanitized.items[0].name, "item1", "nested array first item name must be preserved");
  assert.equal(sanitized.items[1].name, "item2", "nested array second item name must be preserved");
  assert.equal(sanitized.items[0].match_hash, undefined, "nested array match_hash must be removed");
  assert.equal(sanitized.items[1].source_record_fingerprint, undefined, "nested array fingerprint must be removed");
}

// ===== Test: null and primitive values =====
{
  assert.equal(sanitizeResponse(null), null, "null must pass through");
  assert.equal(sanitizeResponse(undefined), undefined, "undefined must pass through");
  assert.equal(sanitizeResponse(42), 42, "number must pass through");
  assert.equal(sanitizeResponse("hello"), "hello", "string must pass through");
  assert.equal(sanitizeResponse(true), true, "boolean must pass through");
}

console.log("All sanitizer control unit tests passed.");
