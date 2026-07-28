import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryWatchTreeAdapter } from "./harness/inMemoryWatchTreeAdapter.js";
import { parseHtmlText, parseJsonText } from "../src/watchtree/parser-core.js";
import { readFileSync } from "node:fs";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("synthetic journey restores, excludes, consents, withdraws, and deletes", async () => {
  globalThis.sessionStorage = storage();
  const adapter = createInMemoryWatchTreeAdapter("integration-state");
  const seeded = await adapter.seedDemo();
  assert.equal(seeded.events.length, 48);
  assert.equal(seeded.matchingEnabled, false);

  const enabled = await adapter.mutatePrivacy("enable_import_matching", { import_id: seeded.import.id });
  assert.equal(enabled.matchingEnabled, true);
  assert.equal(enabled.candidates.length, 3);

  const before = enabled.tree.eligible_event_count;
  const event = enabled.events[0];
  const excluded = await adapter.mutatePrivacy("exclude_event", { import_id: enabled.import.id, event_id: event.id });
  assert.equal(excluded.events.find((item) => item.id === event.id).sensitivity_excluded, true);
  assert.ok(excluded.tree.eligible_event_count < before);

  const candidate = excluded.candidates[0];
  const token = candidate.evidence_tokens[0].id;
  const granted = await adapter.setConsent(candidate.id, [token], "grant");
  assert.equal(granted.consent.state, "granted");
  const mutual = await adapter.simulateMutual(candidate.id);
  assert.equal(mutual.mutual.is_simulated, true);

  const restoredAdapter = createInMemoryWatchTreeAdapter("integration-state");
  const restored = await restoredAdapter.restore();
  assert.equal(restored.mutual.state, "mutual");
  const revoked = await restoredAdapter.setConsent(candidate.id, [], "revoke");
  assert.equal(revoked.consent.state, "revoked");
  assert.equal((await restoredAdapter.restore()).mutual, null);

  await restoredAdapter.mutatePrivacy("delete_all", {});
  assert.equal((await restoredAdapter.restore()).import, null);
});

test("HTML and JSON previews commit the same bounded owner-only model", async () => {
  for (const [name, parsed] of [
    ["json", parseJsonText(fixture("watch-history.synthetic.json"))],
    ["html", parseHtmlText(fixture("watch-history.synthetic.html"))],
  ]) {
    globalThis.sessionStorage = storage();
    const adapter = createInMemoryWatchTreeAdapter(`import-${name}`);
    const preview = await adapter.validatePreview({
      file_sha256: "a".repeat(64),
      records: parsed.events,
      counts: parsed.counts,
    });
    assert.ok(preview.confirmation_token.startsWith("confirm_"));
    const committed = await adapter.commitPreview({
      source_type: name === "json" ? "google_takeout_json" : "google_takeout_html",
      records: preview.records,
    });
    assert.equal(committed.import.status, "completed");
    assert.ok(committed.events.every((event) => event.matching_enabled === false));
    assert.equal((await adapter.restore()).events.length, parsed.events.length);
  }
});
