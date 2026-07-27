import { createClientFromRequest } from "npm:@base44/sdk";
import { authenticate, bounded, digestHex, fail, json, NORMALIZATION_VERSION, requirePostJson, readInput, stableStringify, validNonce, VIDEO_ID } from "../_shared/watchtree.js";

const SOURCES = new Set(["google_takeout_json", "google_takeout_html"]);
function normalize(record, ordinal, sourceType) {
  if (!record || typeof record !== "object") return { status: "rejected", code: "MALFORMED_RECORD", ordinal };
  const id = bounded(record.normalized_content_id, 128);
  const timestamp = Date.parse(record.watched_at ?? "");
  if (!VIDEO_ID.test(id)) return { status: "excluded", code: "CONTENT_ID_INVALID", ordinal };
  if (!Number.isFinite(timestamp)) return { status: "rejected", code: "TIMESTAMP_MISSING", ordinal };
  const first = Date.parse(record.first_watched_at ?? record.watched_at ?? "");
  const last = Date.parse(record.last_watched_at ?? record.watched_at ?? "");
  return { status: "accepted", event: { source_platform: "youtube", source_type: sourceType, normalized_content_id: id, bounded_title: bounded(record.bounded_title, 240) || "Untitled video", bounded_creator_label: bounded(record.bounded_creator_label, 160), canonical_public_url: `https://www.youtube.com/watch?v=${id}`, watched_at: new Date(timestamp).toISOString(), repeat_count: Math.max(1, Math.min(999, Number(record.repeat_count) || 1)), first_watched_at: new Date(Number.isFinite(first) ? first : timestamp).toISOString(), last_watched_at: new Date(Number.isFinite(last) ? last : timestamp).toISOString(), occurrence_index: Math.max(1, Math.min(999, Number(record.occurrence_index) || 1)), same_second_ordinal: Math.max(0, Math.min(99, Number(record.same_second_ordinal) || 0)), visibility_state: "owner_only", matching_enabled: false, sensitivity_excluded: false, exclusion_reason: "", optional_owner_note: "", normalization_version: NORMALIZATION_VERSION, canonicalization_version: "youtube-id-v1", is_synthetic: false, fixture_id: "", schema_version: 1, source_ordinal: ordinal, creator_key: bounded(record.creator_key, 128) } };
}
Deno.serve(async (req) => {
  const rejected = await requirePostJson(req); if (rejected) return rejected;
  const base44 = createClientFromRequest(req); if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);
  const input = await readInput(req); if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (!SOURCES.has(input.source_type)) return fail("SOURCE_TYPE_UNSUPPORTED", 415);
  if (!/^[a-f0-9]{64}$/.test(input.file_sha256 ?? "")) return fail("FILE_DIGEST_INVALID", 400);
  if (!Array.isArray(input.records) || input.records.length < 1 || input.records.length > 200) return fail("RECORD_CHUNK_INVALID", 400);
  if (!input.counts || Number(input.counts.accepted) > 5000 || Number(input.counts.rejected) > 250) return fail("PREVIEW_LIMIT_EXCEEDED", 413);
  const results = input.records.map((record, index) => normalize(record, Number(input.chunk_offset ?? 0) + index, input.source_type));
  const events = results.filter((result)=>result.status === "accepted").map((result)=>result.event);
  const errors = results.filter((result)=>result.status !== "accepted").slice(0,20).map(({ordinal,code})=>({ordinal,code}));
  const acceptedDigest = await digestHex(events.map((event)=>[event.normalized_content_id,event.watched_at,event.same_second_ordinal]));
  const confirmationToken = `preview_${(await digestHex(`${input.file_sha256}|${input.source_type}|${input.total_records}|${input.total_chunks}|${NORMALIZATION_VERSION}`)).slice(0,48)}`;
  return json({ ok: true, confirmation_token: confirmationToken, normalized_records: events, chunk_digest: acceptedDigest, counts: { accepted: events.length, excluded: results.filter((result)=>result.status === "excluded").length, rejected: results.filter((result)=>result.status === "rejected").length }, errors, normalization_version: NORMALIZATION_VERSION });
});
