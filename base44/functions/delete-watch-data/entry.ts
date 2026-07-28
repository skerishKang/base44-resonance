import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  clearDerivedRecords,
  deleteAllRecords,
  deleteImportRecords,
  fail,
  json,
  listAllRecords,
  publicEvent,
  requirePostJson,
  readInput,
  unavailable,
  updateRecords,
  validNonce,
} from "./_shared/watchtree.js";

const ACTIONS = new Set(["enable_import_matching", "disable_import_matching", "exclude_event", "exclude_creator", "exclude_date_range", "delete_import", "delete_all"]);

async function clearDerived(base44, importId) {
  const result = await clearDerivedRecords(base44, importId);
  if (!result.complete) throw new Error("DERIVED_DELETE_INCOMPLETE");
  return result;
}

function deletionResponse(result) {
  return json({ ok: true, deleted: result.complete, complete: result.complete, progress: result.progress, events: [], tree: null, candidates: [] });
}

Deno.serve(async (req) => {
  const rejected = await requirePostJson(req); if (rejected) return rejected;
  const base44 = createClientFromRequest(req);
  if (!await authenticate(base44)) return fail("AUTH_REQUIRED", 401);
  const input = await readInput(req);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400);
  if (!ACTIONS.has(input.action)) return fail("ACTION_UNSUPPORTED", 400);
  try {
    if (input.action === "delete_all") return deletionResponse(await deleteAllRecords(base44));
    const watchImport = await unavailable(() => base44.entities.WatchImport.get(input.import_id));
    if (!watchImport) return fail("RESOURCE_UNAVAILABLE", 404);
    if (input.action === "delete_import") return deletionResponse(await deleteImportRecords(base44, watchImport));
    const events = await listAllRecords(base44.entities.WatchEvent, { import_id: watchImport.id }, "watched_at");
    if (input.action === "enable_import_matching") {
      await updateRecords(base44.entities.WatchEvent, events, (event) => event.sensitivity_excluded?{matching_enabled:false}:{ matching_enabled: true, visibility_state: "matchable_private", exclusion_reason: "" });
      await base44.entities.WatchImport.update(watchImport.id, { matching_enabled: true });
    }
    if (input.action === "disable_import_matching") {
      await updateRecords(base44.entities.WatchEvent, events, (event) => ({ matching_enabled: false, visibility_state: "owner_only", exclusion_reason: event.sensitivity_excluded ? event.exclusion_reason : "import_disabled" }));
      await base44.entities.WatchImport.update(watchImport.id, { matching_enabled: false });
      await clearDerived(base44, watchImport.id);
    }
    if (input.action === "exclude_event") {
      const event = await unavailable(() => base44.entities.WatchEvent.get(input.event_id));
      if (!event || event.import_id !== watchImport.id) return fail("RESOURCE_UNAVAILABLE", 404);
      await base44.entities.WatchEvent.update(event.id, { matching_enabled: false, sensitivity_excluded:true, exclusion_reason: "item" });
      await clearDerived(base44, watchImport.id);
    }
    if (input.action === "exclude_creator") {
      const label = String(input.creator_label ?? "").trim();
      if (!label) return fail("CREATOR_INVALID", 400);
      await updateRecords(base44.entities.WatchEvent, events.filter((event) => event.bounded_creator_label === label), () => ({ matching_enabled: false, sensitivity_excluded:true, exclusion_reason: "creator" }));
      await clearDerived(base44, watchImport.id);
    }
    if (input.action === "exclude_date_range") {
      const from = String(input.from ?? "");
      const to = String(input.to ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return fail("DATE_RANGE_INVALID", 400);
      await updateRecords(base44.entities.WatchEvent, events.filter((event) => event.watched_at.slice(0, 10) >= from && event.watched_at.slice(0, 10) <= to), () => ({ matching_enabled: false, sensitivity_excluded:true, exclusion_reason: "date_range" }));
      await clearDerived(base44, watchImport.id);
    }
    const current = await listAllRecords(base44.entities.WatchEvent, { import_id: watchImport.id }, "watched_at");
    return json({ ok: true, events: current.map(publicEvent), tree: null, candidates: [] });
  } catch {
    return fail("DELETE_INCOMPLETE", 500, true);
  }
});
