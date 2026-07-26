const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const LOCALES = new Set(["en", "ko"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateComputeMatchesInput(input) {
  if (!isPlainObject(input)) return { ok: false, code: "INVALID_INPUT" };
  if (typeof input.fingerprint_id !== "string" || !ID_PATTERN.test(input.fingerprint_id)) {
    return { ok: false, code: "INVALID_FINGERPRINT_ID" };
  }

  const locale = input.locale ?? "en";
  if (!LOCALES.has(locale)) return { ok: false, code: "INVALID_LOCALE" };

  return { ok: true, fingerprintId: input.fingerprint_id, locale };
}
