import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  CONSENT_VERSION,
  deleteRecords,
  fail,
  json,
  requirePostJson,
  readInput,
  unavailable,
  validNonce,
} from "../_shared/watchtree.js";

const sameTokens = (a: unknown, b: unknown) => JSON.stringify([...(Array.isArray(a) ? a : [])].sort())
  === JSON.stringify([...(Array.isArray(b) ? b : [])].sort());

Deno.serve(async (req) => {
  const rejected = await requirePostJson(req);
  if (rejected) return rejected;
  const base44 = createClientFromRequest(req);
  if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);
  const input = await readInput(req);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (!["grant", "revoke"].includes(input.state) || input.consent_version !== CONSENT_VERSION) {
    return fail("CONSENT_INPUT_INVALID", 400);
  }

  const candidate = await unavailable(() => base44.entities.SharedPathCandidate.get(input.candidate_id));
  if (!candidate || candidate.candidate_kind !== "synthetic") return fail("RESOURCE_UNAVAILABLE", 404);
  const allowed = new Set((candidate.evidence_tokens ?? []).map((token: Record<string, unknown>) => token.id));
  const selected = [...new Set(Array.isArray(input.selected_evidence_tokens) ? input.selected_evidence_tokens : [])]
    .filter((token) => allowed.has(token))
    .slice(0, 10);
  if (input.state === "grant" && !selected.length) return fail("EVIDENCE_REQUIRED", 409);

  const nonceRows = await base44.entities.RevealConsent.filter(
    { client_nonce: input.client_nonce },
    "-created_date",
    1,
    0,
  );
  if (nonceRows?.[0]) {
    const expectedState = input.state === "grant" ? "granted" : "revoked";
    if (
      nonceRows[0].candidate_id !== candidate.id
      || nonceRows[0].state !== expectedState
      || !sameTokens(nonceRows[0].selected_evidence_tokens, input.state === "grant" ? selected : [])
    ) {
      return fail("NONCE_CONFLICT", 409);
    }
    return json({ ok: true, consent: nonceRows[0], idempotent_replay: true });
  }

  const existing = await base44.entities.RevealConsent.filter(
    { candidate_id: candidate.id },
    "-created_date",
    1,
    0,
  );
  const payload = {
    candidate_id: candidate.id,
    candidate_ref_opaque: candidate.candidate_ref_opaque,
    selected_evidence_tokens: input.state === "grant" ? selected : [],
    state: input.state === "grant" ? "granted" : "revoked",
    consent_version: CONSENT_VERSION,
    client_nonce: input.client_nonce,
    granted_at: input.state === "grant" ? new Date().toISOString() : existing?.[0]?.granted_at ?? "",
    revoked_at: input.state === "revoke" ? new Date().toISOString() : "",
    is_synthetic: true,
    schema_version: 1,
  };
  const consent = existing?.[0]?.id
    ? await base44.entities.RevealConsent.update(existing[0].id, payload)
    : await base44.entities.RevealConsent.create(payload);
  await base44.entities.SharedPathCandidate.update(candidate.id, {
    reveal_state: input.state === "grant" ? "consented" : "revoked",
  });
  if (input.state === "revoke") {
    const mutuals = await base44.entities.MutualResonance.filter(
      { candidate_id: candidate.id },
      "-created_date",
      20,
      0,
    );
    await deleteRecords(base44.entities.MutualResonance, mutuals);
  }
  return json({ ok: true, consent });
});
