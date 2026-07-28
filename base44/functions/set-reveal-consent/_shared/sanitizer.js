// Internal fields that must NOT be exposed to browser/client responses
export const INTERNAL_FIELDS = new Set([
  "match_hash",
  "source_record_fingerprint",
  "input_digest",
  "source_digest",
]);

// Recursive response sanitizer: strips all internal fields from any response object.
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

// Legacy publicEvent helper - now uses the generic sanitizer
export function publicEvent(record) {
  return sanitizeResponse(record);
}
