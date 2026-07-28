export const INTERNAL_FIELDS = new Set([
  "match_hash",
  "source_record_fingerprint",
  "input_digest",
  "source_digest",
  "client_nonce_digest",
  "payload_digest",
]);

export function sanitizeResponse(record) {
  if (!record || typeof record !== "object") return record;
  if (Array.isArray(record)) return record.map(sanitizeResponse);
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (INTERNAL_FIELDS.has(key)) continue;
    cleaned[key] = sanitizeResponse(value);
  }
  return cleaned;
}

export function publicEvent(record) {
  return sanitizeResponse(record);
}