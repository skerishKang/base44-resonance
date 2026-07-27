import { createClientFromRequest } from "npm:@base44/sdk";
import { authenticate, buildTree, digestHex, fail, json, MATCHING_VERSION, publicEvent, requirePostJson, readInput, unavailable, validNonce } from "../_shared/watchtree.js";
Deno.serve(async (req) => {
  const rejected=await requirePostJson(req);if(rejected)return rejected;const base44=createClientFromRequest(req);if(!await authenticate(base44))return fail("AUTH_REQUIRED",401);
  const input=await readInput(req);if(!validNonce(input))return fail("INVALID_CLIENT_NONCE",400);if(input.matching_version!==MATCHING_VERSION)return fail("VERSION_UNSUPPORTED",409);
  const watchImport=await unavailable(()=>base44.entities.WatchImport.get(input.import_id));if(!watchImport||watchImport.status!=="completed")return fail("RESOURCE_UNAVAILABLE",404);
  const events=await base44.entities.WatchEvent.filter({import_id:watchImport.id},"watched_at",5000,0);if(!events.length)return fail("NO_ELIGIBLE_EVENTS",409);
  const summary=buildTree(events);const digest=await digestHex(events.map((event)=>[event.source_record_fingerprint,event.matching_enabled,event.sensitivity_excluded]));
  const existing=await base44.entities.WatchTreeFingerprint.filter({import_id:watchImport.id,matching_version:MATCHING_VERSION},"-created_date",1,0);
  const payload={import_id:watchImport.id,input_digest:digest,normalization_version:watchImport.normalization_version,matching_version:MATCHING_VERSION,...summary,stale:false,is_synthetic:Boolean(watchImport.is_synthetic),schema_version:1};
  const tree=existing?.[0]?.id?await base44.entities.WatchTreeFingerprint.update(existing[0].id,payload):await base44.entities.WatchTreeFingerprint.create(payload);
  return json({ok:true,tree,events:events.map(publicEvent)});
});
