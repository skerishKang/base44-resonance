import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  decorateStoredEvent,
  createMatchSignal,
  digestHex,
  fail,
  json,
  NORMALIZATION_VERSION,
  publicEvent,
  publicImport,
  requirePostJson,
  readInput,
  validNonce,
} from "./_shared/watchtree.js";

const SOURCES = new Set(["google_takeout_json", "google_takeout_html"]);
const MAX_RECORDS = 5_000;
const MAX_CHUNKS = 200;

async function expectedConfirmationToken(input: Record<string, unknown>) {
  const value = [
    input.file_sha256,
    input.source_type,
    input.total_records,
    input.total_chunks,
    NORMALIZATION_VERSION,
  ].join("|");
  return `preview_${(await digestHex(value)).slice(0, 48)}`;
}

Deno.serve(async (req) => {
  const rejected = await requirePostJson(req);
  if (rejected) return rejected;

  const base44 = createClientFromRequest(req);
  if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);

  const input = await readInput(req);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (!SOURCES.has(input.source_type) || !/^[a-f0-9]{64}$/.test(input.file_sha256 ?? "")) {
    return fail("IMPORT_INPUT_INVALID", 400);
  }
  if (!Array.isArray(input.records) || input.records.length < 1 || input.records.length > 200) {
    return fail("RECORD_CHUNK_INVALID", 400);
  }

  const chunkIndex = Number(input.chunk_index);
  const totalChunks = Number(input.total_chunks);
  const totalRecords = Number(input.total_records);
  if (
    !Number.isInteger(chunkIndex)
    || !Number.isInteger(totalChunks)
    || !Number.isInteger(totalRecords)
    || chunkIndex < 0
    || totalChunks < 1
    || totalChunks > MAX_CHUNKS
    || chunkIndex >= totalChunks
    || totalRecords < 1
    || totalRecords > MAX_RECORDS
  ) {
    return fail("CHUNK_INDEX_INVALID", 400);
  }

  if (input.confirmation_token !== await expectedConfirmationToken(input)) {
    return fail("CONFIRMATION_INVALID", 409);
  }

  const chunkDigest = await digestHex(
    input.records.map((event: Record<string, unknown>) => [
      event.normalized_content_id,
      event.watched_at,
      event.same_second_ordinal,
    ]),
  );

  const completedForFile = await base44.entities.WatchImport.filter(
    {
      file_sha256_or_fixture_digest: input.file_sha256,
      normalization_version: NORMALIZATION_VERSION,
      status: "completed",
    },
    "-created_date",
    1,
    0,
  );
  if (completedForFile?.[0]) {
    const existingEvents = await base44.entities.WatchEvent.filter(
      { import_id: completedForFile[0].id },
      "watched_at",
      MAX_RECORDS,
      0,
    );
    return json({
      ok: true,
      import: publicImport(completedForFile[0]),
      events: existingEvents.map(publicEvent),
      complete: true,
      existing_complete: true,
      idempotent_replay: true,
    });
  }

  const imports = await base44.entities.WatchImport.filter(
    { client_nonce: input.client_nonce },
    "-created_date",
    1,
    0,
  );
  let watchImport = imports?.[0] ?? null;
  if (
    watchImport
    && (
      watchImport.file_sha256_or_fixture_digest !== input.file_sha256
      || watchImport.source_type !== input.source_type
      || Number(watchImport.total_chunks) !== totalChunks
    )
  ) {
    return fail("NONCE_CONFLICT", 409);
  }

  if (!watchImport) {
    watchImport = await base44.entities.WatchImport.create({
      source_type: input.source_type,
      source_platform: "youtube",
      status: "committing",
      client_nonce: input.client_nonce,
      file_sha256_or_fixture_digest: input.file_sha256,
      normalization_version: NORMALIZATION_VERSION,
      record_count: totalRecords,
      accepted_count: totalRecords,
      excluded_count: Math.max(0, Number(input.excluded_count) || 0),
      rejected_count: Math.max(0, Number(input.rejected_count) || 0),
      committed_count: 0,
      matching_enabled: false,
      consent_version: "watchtree-consent-v1",
      source_disposition: "browser_local_not_uploaded",
      preview_digest: await digestHex(input.confirmation_token),
      confirmation_token_digest: await digestHex(input.confirmation_token),
      last_committed_chunk: 0,
      total_chunks: totalChunks,
      error_code: "",
      error_sample_codes: [],
      is_synthetic: false,
      fixture_id: "",
      schema_version: 1,
    });
  }

  const receipts = await base44.entities.ImportChunkReceipt.filter(
    { import_id: watchImport.id, chunk_index: chunkIndex },
    "-created_date",
    1,
    0,
  );
  if (receipts?.[0]) {
    if (receipts[0].chunk_digest !== chunkDigest) return fail("CHUNK_CONFLICT", 409);
    const events = input.final_chunk
      ? await base44.entities.WatchEvent.filter({ import_id: watchImport.id }, "watched_at", MAX_RECORDS, 0)
      : [];
    return json({
      ok: true,
      import: publicImport(watchImport),
      events: events.map(publicEvent),
      committed_chunk: chunkIndex,
      complete: watchImport.status === "completed",
      idempotent_replay: true,
    });
  }

  try {
    const stored = [];
    const signals = [];
    for (const [index, event] of input.records.entries()) {
      stored.push(await decorateStoredEvent(event, watchImport.id, chunkIndex * 200 + index));
      signals.push(await createMatchSignal(event, watchImport.id));
    }

    // A Function may be retried after the event batch succeeds but before the receipt is written.
    // Check existing WatchEvents by generating signatures locally.
    const existingEvents = await base44.entities.WatchEvent.filter(
      { import_id: watchImport.id },
      "watched_at",
      MAX_RECORDS,
      0,
    );
    const existingSignatures = new Set(
      existingEvents.map((e: any) => `${e.normalized_content_id}|${e.watched_at}|${e.same_second_ordinal??0}`)
    );
    
    const missingIndices = stored.map((e, i) => existingSignatures.has(`${e.normalized_content_id}|${e.watched_at}|${e.same_second_ordinal??0}`) ? -1 : i).filter((i) => i >= 0);
    
    if (missingIndices.length > 0) {
      const missingEvents = missingIndices.map(i => stored[i]);
      const missingSignals = missingIndices.map(i => signals[i]);
      
      await base44.entities.WatchEvent.bulkCreate(missingEvents);
      await base44.entities.WatchMatchSignal.bulkCreate(missingSignals).catch(async (err: any) => {
          // If WatchMatchSignal fails for some reason (e.g. duplicate due to concurrent partial retry),
          // WatchEvent is already written. 
      });
    }

    await base44.entities.ImportChunkReceipt.create({
      import_id: watchImport.id,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      chunk_digest: chunkDigest,
      record_count: stored.length,
      status: "committed",
      client_nonce: `${input.client_nonce}_${chunkIndex}`,
      schema_version: 1,
    });

    const allEvents = await base44.entities.WatchEvent.filter(
      { import_id: watchImport.id },
      "watched_at",
      MAX_RECORDS,
      0,
    );
    const complete = Boolean(input.final_chunk) && allEvents.length === totalRecords;
    watchImport = await base44.entities.WatchImport.update(watchImport.id, {
      status: complete ? "completed" : "committing",
      committed_count: allEvents.length,
      last_committed_chunk: Math.max(Number(watchImport.last_committed_chunk ?? -1), chunkIndex),
      error_code: complete ? "" : watchImport.error_code ?? "",
    });

    if (input.final_chunk && !complete) {
      return fail("IMPORT_INCOMPLETE", 409, true);
    }

    return json({
      ok: true,
      import: publicImport(watchImport),
      events: complete ? allEvents.map(publicEvent) : [],
      committed_chunk: chunkIndex,
      complete,
      stored_records: missing.length,
    });
  } catch {
    await base44.entities.WatchImport.update(watchImport.id, {
      status: "partial_failed",
      error_code: "IMPORT_PARTIAL_FAILED",
    }).catch(() => {});
    return fail("IMPORT_PARTIAL_FAILED", 503, true);
  }
});
