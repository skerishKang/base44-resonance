import { createClientFromRequest } from "npm:@base44/sdk";
import { buildDeterministicFingerprint } from "./fingerprint.js";
import { sameIdSet, validateGenerateFingerprintInput } from "./validation.js";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

const REQUIRED_SLOTS = new Set(["vivid_moment", "care_expression", "conversation_condition"]);

function json(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function error(code: string, status: number) {
  return json({ ok: false, error: { code } }, status);
}

function publicFingerprint(record: Record<string, unknown>) {
  return {
    id: record.id,
    consent_record_id: record.consent_record_id,
    memory_card_ids: record.memory_card_ids,
    memory_orientation: record.memory_orientation,
    conversational_rhythm: record.conversational_rhythm,
    care_expression: record.care_expression,
    novelty_steadiness: record.novelty_steadiness,
    reflective_intensity: record.reflective_intensity,
    summary: record.summary,
    interpretation_version: record.interpretation_version,
    locale: record.locale,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } }, 405, { Allow: "POST" });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return error("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return error("AUTH_REQUIRED", 401);
  } catch {
    return error("AUTH_REQUIRED", 401);
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return error("INVALID_JSON", 400);
  }

  const validation = validateGenerateFingerprintInput(input);
  if (!validation.ok) return error(validation.code, 400);

  let consent: Record<string, unknown>;
  try {
    consent = await base44.entities.ConsentRecord.get(validation.consentRecordId);
    if (!consent) return error("CONSENT_UNAVAILABLE", 404);
  } catch {
    return error("CONSENT_UNAVAILABLE", 404);
  }

  if (
    consent.active !== true
    || consent.consent_version !== "slice2-demo-v1"
    || !sameIdSet(consent.memory_card_ids, validation.memoryCardIds)
  ) {
    return error("CONSENT_REQUIRED", 409);
  }

  let memoryCards: Record<string, unknown>[];
  try {
    memoryCards = await Promise.all(
      validation.memoryCardIds.map((id) => base44.entities.MemoryCard.get(id)),
    );
    if (memoryCards.some((record) => !record)) return error("MEMORY_CARDS_UNAVAILABLE", 404);
  } catch {
    return error("MEMORY_CARDS_UNAVAILABLE", 404);
  }

  const slots = new Set(memoryCards.map((record) => record.slot));
  if (slots.size !== 3 || [...REQUIRED_SLOTS].some((slot) => !slots.has(slot))) {
    return error("MEMORY_CARDS_UNAVAILABLE", 404);
  }

  const structured = buildDeterministicFingerprint(memoryCards, validation.locale);
  const payload = {
    consent_record_id: validation.consentRecordId,
    memory_card_ids: validation.memoryCardIds,
    ...structured,
  };

  try {
    const existing = await base44.entities.ResonanceFingerprint.filter(
      {
        consent_record_id: validation.consentRecordId,
        interpretation_version: "deterministic-v1",
      },
      "-created_date",
      1,
      0,
    );

    const record = existing?.[0]?.id
      ? await base44.entities.ResonanceFingerprint.update(existing[0].id, payload)
      : await base44.entities.ResonanceFingerprint.create(payload);

    return json({ ok: true, fingerprint: publicFingerprint(record) });
  } catch {
    return error("FINGERPRINT_NOT_STORED", 409);
  }
});
