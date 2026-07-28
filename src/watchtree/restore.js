async function safeFilter(getter) {
  try {
    return (await getter()) ?? [];
  } catch {
    return [];
  }
}

// Restore granted consent and mutual resonance strictly scoped to the active
// restored tree's candidates. Consent and mutual are fetched with
// candidate-scoped Entity queries, so records belonging to another import or
// tree are never listed, let alone attached. Deterministic: candidates are
// visited in the given candidate_rank order, the latest granted consent wins,
// and the mutual must belong to that selected consent's candidate.
export async function restoreScopedMatching(base44, candidates) {
  const allowlist = (candidates ?? []).filter((candidate) => candidate?.id);
  if (allowlist.length === 0) return { consent: null, mutual: null };
  const grantedByCandidate = await Promise.all(
    allowlist.map((candidate) => safeFilter(() => base44.entities.RevealConsent.filter({ candidate_id: candidate.id, state: "granted" }, "-created_date", 1, 0))),
  );
  const grantedIndex = grantedByCandidate.findIndex((rows) => rows.length > 0);
  if (grantedIndex < 0) return { consent: null, mutual: null };
  const consent = grantedByCandidate[grantedIndex][0];
  const mutuals = await safeFilter(() => base44.entities.MutualResonance.filter({ candidate_id: consent.candidate_id, state: "mutual" }, "-created_date", 1, 0));
  return { consent, mutual: mutuals[0] ?? null };
}
