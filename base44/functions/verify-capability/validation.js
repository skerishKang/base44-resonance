export const MAX_PROBE_ID_LENGTH = 128;

export function validateProbeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const { probe_id: probeId, locale } = input;
  if (
    typeof probeId !== "string"
    || probeId.length === 0
    || probeId.length > MAX_PROBE_ID_LENGTH
    || !/^[A-Za-z0-9_-]+$/.test(probeId)
  ) {
    return { ok: false, code: "INVALID_PROBE_ID" };
  }

  if (locale !== undefined && locale !== "en" && locale !== "ko") {
    return { ok: false, code: "INVALID_LOCALE" };
  }

  return { ok: true, probeId, locale: locale ?? "en" };
}
