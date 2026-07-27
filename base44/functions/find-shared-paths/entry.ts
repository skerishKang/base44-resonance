import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  deleteRecords,
  digestHex,
  fail,
  json,
  MATCHING_VERSION,
  orderCandidates,
  publicCandidate,
  requirePostJson,
  readInput,
  unavailable,
  validNonce,
} from "../_shared/watchtree.js";

Deno.serve(async (req) => {
  const rejected = await requirePostJson(req);
  if (rejected) return rejected;
  const base44 = createClientFromRequest(req);
  if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);
  const input = await readInput(req);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (input.matching_version !== MATCHING_VERSION) return fail("VERSION_UNSUPPORTED", 409);

  const tree = await unavailable(() => base44.entities.WatchTreeFingerprint.get(input.fingerprint_id));
  if (!tree || tree.stale) return fail("RESOURCE_UNAVAILABLE", 404);
  const watchImport = await unavailable(() => base44.entities.WatchImport.get(tree.import_id));
  if (!watchImport || watchImport.matching_enabled !== true) return fail("MATCHING_DISABLED", 409);

  const events = await base44.entities.WatchEvent.filter(
    { import_id: watchImport.id },
    "watched_at",
    5_000,
    0,
  );
  const eligible = events.filter((event: Record<string, unknown>) =>
    event.matching_enabled === true && event.sensitivity_excluded !== true
  );
  if (new Set(eligible.map((event: Record<string, unknown>) => event.normalized_content_id)).size < 10) {
    return fail("NO_ELIGIBLE_EVENTS", 409);
  }

  const sourceDigest = await digestHex(
    eligible.map((event: Record<string, unknown>) => [
      event.source_record_fingerprint,
      event.matching_enabled,
      event.sensitivity_excluded,
    ]),
  );
  const existingSame = await base44.entities.SharedPathCandidate.filter(
    { fingerprint_id: tree.id, source_digest: sourceDigest },
    "candidate_rank",
    20,
    0,
  );
  if (existingSame?.length) {
    return json({ ok: true, candidates: existingSame.map(publicCandidate), idempotent_replay: true });
  }

  const old = await base44.entities.SharedPathCandidate.filter(
    { fingerprint_id: tree.id },
    "candidate_rank",
    20,
    0,
  );
  const scored = orderCandidates(eligible);
  const created = [];
  try {
    for (const [index, candidate] of scored.entries()) {
      created.push(await base44.entities.SharedPathCandidate.create({
        fingerprint_id: tree.id,
        candidate_ref_opaque: `synthetic:${candidate.id}:demo-corpus-v1`,
        candidate_kind: "synthetic",
        candidate_label: candidate.label,
        candidate_rank: index + 1,
        matching_version: MATCHING_VERSION,
        score_band: candidate.score_band,
        exact_overlap_count: candidate.exact_overlap_count,
        rare_overlap_count: candidate.rare_overlap_count,
        shared_path_count: candidate.shared_path_count,
        repeated_overlap_count: candidate.repeated_overlap_count,
        meaningful_difference_present: candidate.meaningful_difference_present,
        evidence_tokens: candidate.evidence_tokens,
        reveal_state: "private",
        source_digest: sourceDigest,
        is_simulated: true,
        schema_version: 1,
      }));
    }
  } catch {
    await deleteRecords(base44.entities.SharedPathCandidate, created).catch(() => {});
    return fail("CANDIDATE_BUILD_FAILED", 503, true);
  }

  await deleteRecords(
    base44.entities.SharedPathCandidate,
    old.filter((candidate: Record<string, unknown>) => candidate.source_digest !== sourceDigest),
  );
  return json({ ok: true, candidates: created.map(publicCandidate) });
});
