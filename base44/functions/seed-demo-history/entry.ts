import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  buildTree,
  CONSENT_VERSION,
  decorateStoredEvent,
  deleteRecords,
  demoEventsA,
  digestHex,
  fail,
  FIXTURE_ID,
  json,
  MATCHING_VERSION,
  publicCandidate,
  publicEvent,
  publicImport,
  requirePostJson,
  readInput,
  validNonce,
} from "../_shared/watchtree.js";

Deno.serve(async (req) => {
  const rejected = requirePostJson(req);
  if (rejected) return rejected;
  const base44 = createClientFromRequest(req);
  if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);
  const input = await readInput(req);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (input.fixture_id !== FIXTURE_ID || input.consent_version !== CONSENT_VERSION) {
    return fail("FIXTURE_UNAVAILABLE", 404);
  }

  const completedFixture = await base44.entities.WatchImport.filter(
    { fixture_id: FIXTURE_ID, status: "completed", normalization_version: "demo-v1" },
    "-created_date",
    1,
    0,
  );
  if (completedFixture?.[0]) {
    const events = await base44.entities.WatchEvent.filter(
      { import_id: completedFixture[0].id },
      "watched_at",
      5_000,
      0,
    );
    const trees = await base44.entities.WatchTreeFingerprint.filter(
      { import_id: completedFixture[0].id, stale: false },
      "-created_date",
      1,
      0,
    );
    const candidates = trees?.[0]?.id
      ? await base44.entities.SharedPathCandidate.filter(
        { fingerprint_id: trees[0].id },
        "candidate_rank",
        20,
        0,
      )
      : [];
    return json({
      ok: true,
      import: publicImport(completedFixture[0]),
      events: events.map(publicEvent),
      tree: trees?.[0] ?? null,
      candidates: candidates.map(publicCandidate),
      matchingEnabled: Boolean(completedFixture[0].matching_enabled),
      existing_complete: true,
      idempotent_replay: true,
    });
  }

  const nonceImport = await base44.entities.WatchImport.filter(
    { client_nonce: input.client_nonce },
    "-created_date",
    1,
    0,
  );
  if (nonceImport?.[0] && nonceImport[0].fixture_id !== FIXTURE_ID) {
    return fail("NONCE_CONFLICT", 409);
  }

  const fixtureDigest = await digestHex(`${FIXTURE_ID}|demo-corpus-v1`);
  let record;
  try {
    record = nonceImport?.[0] ?? await base44.entities.WatchImport.create({
      source_type: "synthetic_demo",
      source_platform: "synthetic_demo",
      status: "committing",
      client_nonce: input.client_nonce,
      file_sha256_or_fixture_digest: fixtureDigest,
      normalization_version: "demo-v1",
      record_count: 48,
      accepted_count: 48,
      excluded_count: 0,
      rejected_count: 0,
      committed_count: 0,
      matching_enabled: false,
      consent_version: CONSENT_VERSION,
      source_disposition: "synthetic_fixture",
      preview_digest: fixtureDigest,
      confirmation_token_digest: fixtureDigest,
      last_committed_chunk: 0,
      total_chunks: 1,
      error_code: "",
      error_sample_codes: [],
      is_synthetic: true,
      fixture_id: FIXTURE_ID,
      schema_version: 1,
    });

    const prepared = [];
    for (const [index, event] of demoEventsA().entries()) {
      prepared.push(await decorateStoredEvent(event, record.id, index));
    }
    const current = await base44.entities.WatchEvent.filter(
      { import_id: record.id },
      "watched_at",
      5_000,
      0,
    );
    const fingerprints = new Set(current.map((event: Record<string, unknown>) => event.source_record_fingerprint));
    const missing = prepared.filter((event) => !fingerprints.has(event.source_record_fingerprint));
    if (missing.length) await base44.entities.WatchEvent.bulkCreate(missing);

    const receipts = await base44.entities.ImportChunkReceipt.filter(
      { import_id: record.id, chunk_index: 0 },
      "-created_date",
      1,
      0,
    );
    if (!receipts?.[0]) {
      await base44.entities.ImportChunkReceipt.create({
        import_id: record.id,
        chunk_index: 0,
        total_chunks: 1,
        chunk_digest: await digestHex(prepared.map((event) => event.source_record_fingerprint)),
        record_count: prepared.length,
        status: "committed",
        client_nonce: `${input.client_nonce}_0`,
        schema_version: 1,
      });
    }

    const events = await base44.entities.WatchEvent.filter(
      { import_id: record.id },
      "watched_at",
      5_000,
      0,
    );
    if (events.length !== 48) return fail("DEMO_SEED_PARTIAL_FAILED", 503, true);

    record = await base44.entities.WatchImport.update(record.id, {
      status: "completed",
      committed_count: events.length,
      last_committed_chunk: 0,
      error_code: "",
    });

    const summary = buildTree(events);
    const inputDigest = await digestHex(
      events.map((event: Record<string, unknown>) => event.source_record_fingerprint),
    );
    const existingTrees = await base44.entities.WatchTreeFingerprint.filter(
      { import_id: record.id, matching_version: MATCHING_VERSION },
      "-created_date",
      1,
      0,
    );
    const payload = {
      import_id: record.id,
      input_digest: inputDigest,
      normalization_version: "demo-v1",
      matching_version: MATCHING_VERSION,
      ...summary,
      stale: false,
      is_synthetic: true,
      schema_version: 1,
    };
    const tree = existingTrees?.[0]?.id
      ? await base44.entities.WatchTreeFingerprint.update(existingTrees[0].id, payload)
      : await base44.entities.WatchTreeFingerprint.create(payload);

    return json({
      ok: true,
      import: publicImport(record),
      events: events.map(publicEvent),
      tree,
      candidates: [],
      matchingEnabled: false,
    });
  } catch {
    if (record?.id) {
      const events = await base44.entities.WatchEvent.filter(
        { import_id: record.id },
        "watched_at",
        5_000,
        0,
      ).catch(() => []);
      await deleteRecords(base44.entities.WatchEvent, events).catch(() => {});
      await base44.entities.WatchImport.update(record.id, {
        status: "partial_failed",
        error_code: "DEMO_SEED_PARTIAL_FAILED",
      }).catch(() => {});
    }
    return fail("DEMO_SEED_PARTIAL_FAILED", 503, true);
  }
});
