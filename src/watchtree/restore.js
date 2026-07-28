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
// tree are never listed, let alone attached. The latest granted consent across
// all active candidates wins (by created_date), with a deterministic
// candidate_rank then candidate_id tie-break; mutual is queried only for that
// selected consent's candidate.
export async function restoreScopedMatching(base44, candidates) {
  const allowlist = (candidates ?? []).filter((candidate) => candidate?.id);
  if (allowlist.length === 0) return { consent: null, mutual: null };
  const grantedByCandidate = await Promise.all(
    allowlist.map((candidate) => safeFilter(() => base44.entities.RevealConsent.filter({ candidate_id: candidate.id, state: "granted" }, "-created_date", 1, 0))),
  );
  let selected = null;
  allowlist.forEach((candidate, index) => {
    const latest = grantedByCandidate[index]?.[0];
    if (!latest) return;
    const rank = candidate.candidate_rank ?? index;
    const candidateId = String(candidate.id);
    const contender = { consent: latest, rank, candidateId };
    if (!selected) { selected = contender; return; }
    const latestDate = String(latest.created_date ?? "");
    const selectedDate = String(selected.consent.created_date ?? "");
    if (latestDate > selectedDate) { selected = contender; return; }
    if (latestDate === selectedDate && (rank < selected.rank || (rank === selected.rank && candidateId < String(selected.candidateId)))) {
      selected = contender;
    }
  });
  if (!selected) return { consent: null, mutual: null };
  const mutuals = await safeFilter(() => base44.entities.MutualResonance.filter({ candidate_id: selected.consent.candidate_id, state: "mutual" }, "-created_date", 1, 0));
  return { consent: selected.consent, mutual: mutuals[0] ?? null };
}
