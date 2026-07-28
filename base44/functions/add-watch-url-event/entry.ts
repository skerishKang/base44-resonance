import { createClientFromRequest } from "npm:@base44/sdk";
import {
  json, fail, authenticate, requirePostJson, readInput, validNonce,
  validateConfirmationToken, bounded, digestHex, decorateStoredEvent,
  createMatchSignal, JSON_HEADERS, NORMALIZATION_VERSION, BATCH_SIZE,
  FIXTURE_ID, URL_COLLECTION_DIGEST,
} from "./_shared/watchtree.js";

async function findOrCreateUrlCollection(base44, userId) {
  const imports = await base44.entities.WatchImport.filter(
    { source_type: "url_collection", status: "completed" },
    "-created_date", 1, 0
  );
  const existing = imports?.[0];
  if (existing) return existing;
  const nonce = crypto.randomUUID();
  const newImport = await base44.entities.WatchImport.create({
    source_type: "url_collection",
    source_platform: "youtube",
    status: "completed",
    client_nonce: nonce,
    file_sha256_or_fixture_digest: URL_COLLECTION_DIGEST,
    normalization_version: NORMALIZATION_VERSION,
    record_count: 0,
    accepted_count: 0,
    excluded_count: 0,
    rejected_count: 0,
    committed_count: 0,
    matching_enabled: false,
    consent_version: "watchtree-consent-v1",
    source_disposition: "browser_local_not_uploaded",
    is_synthetic: false,
    schema_version: 1,
  });
  return newImport;
}

async function checkDuplicate(base44, importId, videoId) {
  const existing = await base44.entities.WatchEvent.filter(
    { import_id: importId, normalized_content_id: videoId },
    "watched_at", 1, 0
  );
  return existing?.[0] ?? null;
}

async function checkIdempotent(base44, importId, nonceDigest) {
  const existing = await base44.entities.WatchEvent.filter(
    { import_id: importId, client_nonce_digest: nonceDigest },
    "watched_at", 1, 0
  );
  return existing?.[0] ?? null;
}

Deno.serve(async (req) => {
  const guardError = await requirePostJson(req);
  if (guardError) return guardError;
  const base44 = createClientFromRequest(req);
  const user = await authenticate(base44);
  if (!user) return fail("AUTH_REQUIRED", 401, false);
  const input = await readInput(req);
  if (!input) return fail("REQUEST_TOO_LARGE", 413, false);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400, false);
  const videoId = input.video_id ?? "";
  if (typeof videoId !== "string" || videoId.length < 1 || videoId.length > 128) return fail("VIDEO_ID_INVALID", 400, false);
  const watchedAt = input.watched_at ?? new Date().toISOString();
  if (typeof watchedAt !== "string" || watchedAt.length < 20 || watchedAt.length > 40) return fail("URL_INVALID", 400, false);
  if (!Number.isFinite(Date.parse(watchedAt))) return fail("URL_INVALID", 400, false);
  const rewatch = input.rewatch === true;
  const privateNote = bounded(input.private_note ?? "", 500);
  const confirmationToken = input.confirmation_token ?? "";
  const nonceDigest = input.client_nonce ? await digestHex(input.client_nonce) : "";
  const payloadDigest = await digestHex(JSON.stringify({ video_id: videoId, watched_at: watchedAt, rewatch, private_note: privateNote, confirmation_token: confirmationToken }));

  const metadata = await validateConfirmationToken(confirmationToken, videoId);
  if (!metadata) return fail("CONFIRMATION_INVALID", 400, false);
  const urlCollection = await findOrCreateUrlCollection(base44, user.id);
  if (!urlCollection) return fail("IMPORT_UNAVAILABLE", 500, false);

  if (nonceDigest) {
    const idempotentEvent = await checkIdempotent(base44, urlCollection.id, nonceDigest);
    if (idempotentEvent) {
      if (idempotentEvent.payload_digest !== payloadDigest) {
        return fail("NONCE_CONFLICT", 409, false);
      }
      return json({ ok: true, import: urlCollection, event: idempotentEvent, idempotent: true }, 200, JSON_HEADERS);
    }
  }
  if (!rewatch) {
    const duplicate = await checkDuplicate(base44, urlCollection.id, videoId);
    if (duplicate) {
      return json({
        ok: true,
        import: urlCollection,
        event: duplicate,
        duplicate: true,
      }, 200, JSON_HEADERS);
    }
  }
  const eventCount = await base44.entities.WatchEvent.filter(
    { import_id: urlCollection.id },
    "-created_date", 1, 0
  );
  const nextOrdinal = (eventCount?.[0]?.source_ordinal ?? 0) + 1;
  const eventData = {
    import_id: urlCollection.id,
    source_platform: "youtube",
    source_type: "url_single",
    normalized_content_id: `youtube:v1:video:${videoId}`,
    bounded_title: metadata.bounded_title || "Untitled video",
    bounded_creator_label: metadata.bounded_creator_label,
    channel_id: metadata.channel_id,
    duration_seconds: metadata.duration_seconds,
    category_id: metadata.category_id,
    published_at: metadata.published_at,
    canonical_public_url: `https://www.youtube.com/watch?v=${videoId}`,
    watched_at: watchedAt,
    repeat_count: 1,
    first_watched_at: watchedAt,
    last_watched_at: watchedAt,
    occurrence_index: 1,
    same_second_ordinal: 0,
    visibility_state: "owner_only",
    matching_enabled: false,
    sensitivity_excluded: false,
    exclusion_reason: "",
    optional_owner_note: privateNote,
    import_id: urlCollection.id,
    normalization_version: NORMALIZATION_VERSION,
    canonicalization_version: "youtube-id-v1",
    creator_key: metadata.bounded_creator_label ? `youtube:channel:${metadata.bounded_creator_label}` : "",
    is_synthetic: false,
    schema_version: 1,
    source_ordinal: nextOrdinal,
    client_nonce_digest: nonceDigest,
    payload_digest: payloadDigest,
  };
  let event;
  try {
    event = await base44.entities.WatchEvent.create(eventData);
  } catch {
    return fail("STORE_FAILED", 500, false);
  }
  try {
    await createMatchSignal(eventData, urlCollection.id);
  } catch {
    // Non-fatal: match signal creation failure does not block event storage
  }
  try {
    await base44.entities.WatchImport.update(urlCollection.id, {
      committed_count: nextOrdinal,
      record_count: nextOrdinal,
      accepted_count: nextOrdinal,
    });
  } catch {
    // Non-fatal: import count update failure does not block event storage
  }

  return json({
    ok: true,
    import: urlCollection,
    event,
  }, 200, JSON_HEADERS);
});