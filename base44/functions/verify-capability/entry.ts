import { createClientFromRequest } from "npm:@base44/sdk";
import { validateProbeInput } from "./validation.js";

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

  const validation = validateProbeInput(input);
  if (!validation.ok) {
    return error(validation.code, 400);
  }

  try {
    const probe = await base44.entities.CapabilityProbe.get(validation.probeId);
    if (!probe) return error("PROBE_UNAVAILABLE", 404);
  } catch {
    return error("PROBE_UNAVAILABLE", 404);
  }

  try {
    await base44.entities.CapabilityProbe.update(validation.probeId, { verified: true });
  } catch {
    return error("PROBE_NOT_VERIFIABLE", 409);
  }

  return json({
    ok: true,
    capabilities: {
      auth: true,
      entity: true,
      function: true,
    },
  });
});
