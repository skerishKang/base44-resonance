// Shared reconciliation utilities for WatchTree data consistency.
// Used by reconcile-watch-data function to clean up orphaned and partial data.

import { listAllRecords } from "./watchtree.js";

export const ALLOWED_ACTIONS = new Set([
  "reconcile_import",
  "reconcile_orphans",
  "reconcile_partial",
]);

export const ALLOWED_ENTITIES = new Set([
  "WatchImport",
  "WatchEvent",
  "WatchTreeFingerprint",
  "SharedPathCandidate",
  "RevealConsent",
  "MutualResonance",
  "ImportChunkReceipt",
]);

export const BATCH_SIZE = 50;
export const MAX_RECORDS = 5000;

export function validateOwnerId(ownerId) {
  if (!ownerId || typeof ownerId !== "string") return false;
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(ownerId)) return false;
  return true;
}

export function validateAction(action) {
  return ALLOWED_ACTIONS.has(action);
}

export function validateEntity(name) {
  return ALLOWED_ENTITIES.has(name);
}

export function boundedError(code, message, retryable = false) {
  return { ok: false, error: { code, message, retryable }, status: code === "INTERNAL" ? 500 : 400 };
}

export async function reconcileImports(base44, ownerId, cursor) {
  const imports = await base44.entities.WatchImport.filter(
    { created_by_id: ownerId },
    "created_date",
    BATCH_SIZE,
    cursor ?? 0,
  );
  const results = [];
  for (const watchImport of imports) {
    if (watchImport.status === "partial_failed" || watchImport.status === "failed") {
      // Clean up orphaned events for failed imports
      const events = await base44.entities.WatchEvent.filter(
        { import_id: watchImport.id },
        "watched_at",
        MAX_RECORDS,
        0,
      );
      for (const event of events) {
        await base44.entities.WatchEvent.delete(event.id).catch(() => {});
      }
      const receipts = await base44.entities.ImportChunkReceipt.filter(
        { import_id: watchImport.id },
        "chunk_index",
        200,
        0,
      );
      for (const receipt of receipts) {
        await base44.entities.ImportChunkReceipt.delete(receipt.id).catch(() => {});
      }
      // Update import status
      await base44.entities.WatchImport.update(watchImport.id, {
        status: "deleted",
        committed_count: 0,
      }).catch(() => {});
      results.push({ import_id: watchImport.id, action: "cleaned", status: "deleted" });
    } else if (watchImport.status === "completed") {
      // Verify derived records exist
      const trees = await base44.entities.WatchTreeFingerprint.filter(
        { import_id: watchImport.id },
        "-created_date",
        1,
        0,
      );
      if (trees.length === 0) {
        results.push({ import_id: watchImport.id, action: "missing_tree", status: "needs_rebuild" });
      } else {
        results.push({ import_id: watchImport.id, action: "ok", status: watchImport.status });
      }
    } else {
      results.push({ import_id: watchImport.id, action: "unchanged", status: watchImport.status });
    }
  }
  return { results, next_cursor: imports.length === BATCH_SIZE ? (cursor ?? 0) + BATCH_SIZE : null };
}

export async function reconcileOrphans(base44, ownerId) {
  const allImports = await listAllRecords(base44.entities.WatchImport, { created_by_id: ownerId }, "created_date");
  const validImportIds = new Set(allImports.map((item) => item.id));
  const results = [];

  // Find orphaned events (events whose import no longer exists)
  const allEvents = await listAllRecords(base44.entities.WatchEvent, { created_by_id: ownerId }, "watched_at");
  for (const event of allEvents) {
    if (!validImportIds.has(event.import_id)) {
      await base44.entities.WatchEvent.delete(event.id).catch(() => {});
      results.push({ resource: "WatchEvent", id: event.id, action: "deleted_orphan" });
    }
  }

  // Find orphaned chunk receipts
  const allReceipts = await listAllRecords(base44.entities.ImportChunkReceipt, { created_by_id: ownerId }, "chunk_index");
  for (const receipt of allReceipts) {
    if (!validImportIds.has(receipt.import_id)) {
      await base44.entities.ImportChunkReceipt.delete(receipt.id).catch(() => {});
      results.push({ resource: "ImportChunkReceipt", id: receipt.id, action: "deleted_orphan" });
    }
  }

  // Find orphaned trees, candidates, consents, mutuals. Mutuals are listed
  // independently of consents so an orphan mutual is deleted even when no
  // RevealConsent remains for its candidate.
  const allTrees = await listAllRecords(base44.entities.WatchTreeFingerprint, { created_by_id: ownerId }, "-created_date");
  const validCandidateIds = new Set();
  for (const tree of allTrees) {
    const candidates = await listAllRecords(base44.entities.SharedPathCandidate, { fingerprint_id: tree.id }, "candidate_rank");
    if (validImportIds.has(tree.import_id)) {
      for (const candidate of candidates) validCandidateIds.add(candidate.id);
      continue;
    }
    for (const candidate of candidates) {
      const [consents, mutuals] = await Promise.all([
        listAllRecords(base44.entities.RevealConsent, { candidate_id: candidate.id }, "-created_date"),
        listAllRecords(base44.entities.MutualResonance, { candidate_id: candidate.id }, "-created_date"),
      ]);
      for (const mutual of mutuals) {
        await base44.entities.MutualResonance.delete(mutual.id).catch(() => {});
        results.push({ resource: "MutualResonance", id: mutual.id, action: "deleted_orphan" });
      }
      for (const consent of consents) {
        await base44.entities.RevealConsent.delete(consent.id).catch(() => {});
        results.push({ resource: "RevealConsent", id: consent.id, action: "deleted_orphan" });
      }
      await base44.entities.SharedPathCandidate.delete(candidate.id).catch(() => {});
      results.push({ resource: "SharedPathCandidate", id: candidate.id, action: "deleted_orphan" });
    }
    await base44.entities.WatchTreeFingerprint.delete(tree.id).catch(() => {});
    results.push({ resource: "WatchTreeFingerprint", id: tree.id, action: "deleted_orphan" });
  }

  // Sweep consent and mutual records whose candidate no longer exists at all,
  // independent of whether a consent record remains.
  const [allConsents, allMutuals] = await Promise.all([
    listAllRecords(base44.entities.RevealConsent, { created_by_id: ownerId }, "-created_date"),
    listAllRecords(base44.entities.MutualResonance, { created_by_id: ownerId }, "-created_date"),
  ]);
  for (const consent of allConsents) {
    if (!validCandidateIds.has(consent.candidate_id)) {
      await base44.entities.RevealConsent.delete(consent.id).catch(() => {});
      results.push({ resource: "RevealConsent", id: consent.id, action: "deleted_orphan" });
    }
  }
  for (const mutual of allMutuals) {
    if (!validCandidateIds.has(mutual.candidate_id)) {
      await base44.entities.MutualResonance.delete(mutual.id).catch(() => {});
      results.push({ resource: "MutualResonance", id: mutual.id, action: "deleted_orphan" });
    }
  }

  return results;
}

export async function reconcilePartial(base44, ownerId, nonce) {
  const partialImports = await base44.entities.WatchImport.filter(
    {
      created_by_id: ownerId,
      status: "partial_failed",
    },
    "created_date",
    BATCH_SIZE,
    0,
  );
  if (nonce) {
    const nonceImport = await base44.entities.WatchImport.filter(
      { created_by_id: ownerId, client_nonce: nonce },
      "-created_date",
      1,
      0,
    );
    if (nonceImport?.[0]) {
      const existing = partialImports.find((item) => item.id === nonceImport[0].id);
      if (!existing) {
        partialImports.push(nonceImport[0]);
      }
    }
  }
  return reconcileImportsByList(base44, partialImports);
}

async function reconcileImportsByList(base44, imports) {
  const results = [];
  for (const watchImport of imports) {
    if (watchImport.status !== "partial_failed" && watchImport.status !== "committing") {
      results.push({ import_id: watchImport.id, action: "skipped", reason: `status=${watchImport.status}` });
      continue;
    }
    const events = await base44.entities.WatchEvent.filter(
      { import_id: watchImport.id },
      "watched_at",
      MAX_RECORDS,
      0,
    );
    const receipts = await base44.entities.ImportChunkReceipt.filter(
      { import_id: watchImport.id },
      "chunk_index",
      200,
      0,
    );
    if (events.length === 0 && receipts.length === 0) {
      await base44.entities.WatchImport.update(watchImport.id, {
        status: "deleted",
        committed_count: 0,
      }).catch(() => {});
      results.push({ import_id: watchImport.id, action: "deleted_empty" });
    } else if (receipts.some((r) => r.status === "committed")) {
      const totalCommitted = receipts
        .filter((r) => r.status === "committed")
        .reduce((sum, r) => sum + r.record_count, 0);
      await base44.entities.WatchImport.update(watchImport.id, {
        status: totalCommitted >= (watchImport.record_count ?? events.length) ? "completed" : "partial_failed",
        committed_count: events.length,
        last_committed_chunk: Math.max(...receipts.filter((r) => r.status === "committed").map((r) => r.chunk_index)),
      }).catch(() => {});
      results.push({
        import_id: watchImport.id,
        action: "updated",
        events: events.length,
        receipts: receipts.filter((r) => r.status === "committed").length,
      });
    } else {
      results.push({ import_id: watchImport.id, action: "needs_manual_review", receipts: receipts.length });
    }
  }
  return results;
}
