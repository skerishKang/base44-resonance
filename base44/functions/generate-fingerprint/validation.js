const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const LOCALES = new Set(["en", "ko"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isBoundedId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function sameIdSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function validateGenerateFingerprintInput(input) {
  if (!isPlainObject(input)) return { ok: false, code: "INVALID_INPUT" };

  const memoryCardIds = input.memory_card_ids;
  if (
    !Array.isArray(memoryCardIds)
    || memoryCardIds.length !== 3
    || new Set(memoryCardIds).size !== 3
    || !memoryCardIds.every(isBoundedId)
  ) {
    return { ok: false, code: "INVALID_MEMORY_CARD_IDS" };
  }

  if (!isBoundedId(input.consent_record_id)) {
    return { ok: false, code: "INVALID_CONSENT_RECORD_ID" };
  }

  const locale = input.locale ?? "en";
  if (!LOCALES.has(locale)) return { ok: false, code: "INVALID_LOCALE" };

  return {
    ok: true,
    memoryCardIds: [...memoryCardIds],
    consentRecordId: input.consent_record_id,
    locale,
  };
}
