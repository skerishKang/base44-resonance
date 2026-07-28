import { createClientFromRequest } from "npm:@base44/sdk";
import {
  json, fail, authenticate, requirePostJson, readInput, validNonce,
  bounded, digestHex, decorateStoredEvent,
  createMatchSignal, JSON_HEADERS, NORMALIZATION_VERSION,
  URL_COLLECTION_DIGEST, parseYouTubeUrl,
} from "./_shared/watchtree.js";
import { publicEvent } from "./_shared/sanitizer.js";

async function findOrCreateUrlCollection(base44) {
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

async function checkDuplicate(base44, importId, normalizedId) {
  const existing = await base44.entities.WatchEvent.filter(
    { import_id: importId, normalized_content_id: normalizedId },
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

async function getEventCount(base44, importId) {
  const events = await base44.entities.WatchEvent.filter(
    { import_id: importId },
    "-created_date", 1, 0
  );
  return (events?.[0]?.source_ordinal ?? 0) + 1;
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

  const videoUrl = input.video_url ?? "";
  const parsed = parseYouTubeUrl(videoUrl);
  if (parsed.error) return fail(parsed.error, 400, false);

  const normalizedId = `youtube:v1:video:${parsed.videoId}`;
  const canonicalUrl = `https://www.youtube.com/watch?v=${parsed.videoId}`;
  const watchedAt = input.watched_at ?? new Date().toISOString();
  if (typeof watchedAt !== "string" || watchedAt.length < 20 || watchedAt.length > 40) return fail("URL_INVALID", 400, false);
  if (!Number.isFinite(Date.parse(watchedAt))) return fail("URL_INVALID", 400, false);
  const rewatch = input.rewatch === true;
  const privateNote = bounded(input.private_note ?? "", 500);
  const titleLabel = bounded(input.title_label ?? "", 240);
  const creatorLabel = bounded(input.creator_label ?? "", 160);

  const nonceDigest = input.client_nonce ? await digestHex(input.client_nonce) : "";
  const payloadDigest = await digestHex(JSON.stringify({ video_url: videoUrl, watched_at: watchedAt, rewatch, private_note: privateNote, title_label: titleLabel, creator_label: creatorLabel }));

  const urlCollection = await findOrCreateUrlCollection(base44);
  if (!urlCollection) return fail("IMPORT_UNAVAILABLE", 500, false);

  if (nonceDigest) {
    const idempotentEvent = await checkIdempotent(base44, urlCollection.id, nonceDigest);
    if (idempotentEvent) {
      if (idempotentEvent.payload_digest !== payloadDigest) {
        return fail("NONCE_CONFLICT", 409, false);
      }
      return json({ ok: true, import: urlCollection, event: publicEvent(idempotentEvent), idempotent: true }, 200, JSON_HEADERS);
    }
  }

  if (!rewatch) {
    const duplicate = await checkDuplicate(base44, urlCollection.id, normalizedId);
    if (duplicate) {
      return json({ ok: true, import: urlCollection, event: publicEvent(duplicate), duplicate: true }, 200, JSON_HEADERS);
    }
  }

  const provenance = (titleLabel || creatorLabel) ? "user_provided" : "none";
  const nextOrdinal = await getEventCount(base44, urlCollection.id);

  const eventData = {
    source_platform: "youtube",
    source_type: "url_collection",
    normalized_content_id: normalizedId,
    bounded_title: titleLabel || `YouTube video ${parsed.videoId}`,
    bounded_creator_label: creatorLabel,
    canonical_public_url: canonicalUrl,
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
    creator_key: creatorLabel ? `youtube:user_label:${creatorLabel}` : "",
    is_synthetic: false,
    fixture_id: "",
    schema_version: 1,
    source_ordinal: nextOrdinal,
    metadata_provenance: provenance,
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
    // Non-fatal
  }

  try {
    await base44.entities.WatchImport.update(urlCollection.id, {
      committed_count: nextOrdinal,
      record_count: nextOrdinal,
      accepted_count: nextOrdinal,
    });
  } catch {
    // Non-fatal
  }

  return json({ ok: true, import: urlCollection, event: publicEvent(event) }, 200, JSON_HEADERS);
});