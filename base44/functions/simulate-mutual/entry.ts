import { createClientFromRequest } from "npm:@base44/sdk";
import { authenticate, CONSENT_VERSION, digestHex, fail, json, requirePostJson, readInput, unavailable, validNonce } from "./_shared/watchtree.js";
Deno.serve(async(req)=>{
 const rejected=await requirePostJson(req);if(rejected)return rejected;const base44=createClientFromRequest(req);if(!await authenticate(base44))return fail("AUTH_REQUIRED",401);const input=await readInput(req);if(!validNonce(input))return fail("INVALID_CLIENT_NONCE",400);
 const candidate=await unavailable(()=>base44.entities.SharedPathCandidate.get(input.candidate_id));if(!candidate||candidate.candidate_kind!=="synthetic"||candidate.is_simulated!==true)return fail("SIMULATION_ONLY",409);
 const consents=await base44.entities.RevealConsent.filter({candidate_id:candidate.id,state:"granted"},"-created_date",1,0);const consent=consents?.[0];if(!consent||!(consent.selected_evidence_tokens??[]).length)return fail("CONSENT_REQUIRED",409);
 const selected=new Set(consent.selected_evidence_tokens);const revealed=(candidate.evidence_tokens??[]).filter((token)=>selected.has(token.id)).slice(0,10).map((token)=>({evidence_type:token.type,label:token.label,count:token.count}));
 const sourceDigest=await digestHex([candidate.id,consent.id,consent.selected_evidence_tokens]);const existing=await base44.entities.MutualResonance.filter({candidate_id:candidate.id,source_digest:sourceDigest},"-created_date",1,0);
 const payload={candidate_id:candidate.id,candidate_ref_opaque:candidate.candidate_ref_opaque,state:"mutual",revealed_items:revealed,mutual_at:new Date().toISOString(),revoked_at:"",simulation_label:"Competition simulation · no real person",consent_version:CONSENT_VERSION,source_digest:sourceDigest,is_simulated:true,schema_version:1};
 const mutual=existing?.[0]?.id?await base44.entities.MutualResonance.update(existing[0].id,payload):await base44.entities.MutualResonance.create(payload);
 return json({ok:true,mutual:{...mutual,message:"Two synthetic viewing paths now resonate."}});
});
