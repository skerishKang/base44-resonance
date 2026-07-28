import { createClientFromRequest } from "npm:@base44/sdk";
import { computeDeterministicMatches } from "./matching.js";
import { validateComputeMatchesInput } from "./validation.js";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function error(code: string, status: number) {
  return json({ ok: false, error: { code } }, status);
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

  const validation = validateComputeMatchesInput(input);
  if (!validation.ok) return error(validation.code, 400);

  let fingerprint: Record<string, unknown>;
  try {
    fingerprint = await base44.entities.ResonanceFingerprint.get(validation.fingerprintId);
    if (!fingerprint) return error("FINGERPRINT_UNAVAILABLE", 404);
  } catch {
    return error("FINGERPRINT_UNAVAILABLE", 404);
  }

  const candidates = computeDeterministicMatches(fingerprint, validation.locale);
  return json({
    ok: true,
    fingerprint_id: validation.fingerprintId,
    candidates,
  });
});
