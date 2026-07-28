import { sanitizeResponse, publicEvent } from "./sanitizer.js";
export { sanitizeResponse, publicEvent };

export const JSON_HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
export const FIXTURE_ID = "watchtree-demo-v1";
export const CORPUS_VERSION = "demo-corpus-v1";
export const NORMALIZATION_VERSION = "yt-takeout-v1";
export const MATCHING_VERSION = "watchtree-match-v1";
export const CONSENT_VERSION = "watchtree-consent-v1";
export const REQUEST_GUARD = 196608;
export const BATCH_SIZE = 100;
export const NONCE = /^[A-Za-z0-9_-]{8,96}$/;
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function json(body, status = 200, headers = {}) { return Response.json(body, { status, headers: { ...JSON_HEADERS, ...headers } }); }
export function fail(code, status = 400, retryable = false) { return json({ ok: false, error: { code, retryable } }, status); }

// Stream-based request body byte guard.
// Reads actual bytes from the request body stream to enforce the limit,
// rather than trusting Content-Length which can be spoofed.
export async function requirePostJson(req) {
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405, false);
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) return fail("UNSUPPORTED_MEDIA_TYPE", 415, false);
  // Read the body stream with a byte limit to avoid trusting Content-Length
  const bytes = await readStreamBytes(req.body, REQUEST_GUARD + 1);
  if (bytes === null) return fail("REQUEST_TOO_LARGE", 413, false);
  if (bytes.byteLength > REQUEST_GUARD) return fail("REQUEST_TOO_LARGE", 413, false);
  // Store bytes for later JSON parsing via req.json()
  req._bodyBytes = bytes;
  return null;
}

// Safely read the request body stream up to maxBytes+1.
// Returns Uint8Array if within limit, null if exceeded.
async function readStreamBytes(stream, maxBytes) {
  if (!stream) {
    // Handle empty/no-body case
    return new Uint8Array(0);
  }
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(value);
      }
    }
  } catch {
    // Stream error during reading
    return null;
  }
  // Concatenate all chunks
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export async function authenticate(base44) {
  try { const user = await base44.auth.me(); return user || null; } catch { return null; }
}

export async function readInput(req) {
  try {
    if (req._bodyBytes) {
      // Parse from pre-read bytes
      const text = new TextDecoder().decode(req._bodyBytes);
      return JSON.parse(text);
    }
    return await req.json();
  } catch { return null; }
}

export function validNonce(input) { return Boolean(input && NONCE.test(input.client_nonce ?? "")); }

// HMAC-SHA256 based digest for internal deduplication.
// Fails closed with HMAC_KEY_UNAVAILABLE if the WATCHTREE_HMAC_KEY
// environment variable is not set or is too short.
export async function digestHex(value) {
  const hmacKey = typeof Deno !== "undefined" ? (Deno.env?.get?.("WATCHTREE_HMAC_KEY") ?? "") : "";
  if (!hmacKey || hmacKey.length < 16) {
    throw new Error("HMAC_KEY_UNAVAILABLE");
  }
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableStringify(value));
  try {
    const keyBytes = new TextEncoder().encode(hmacKey);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, bytes);
    return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    throw new Error("HMAC_KEY_UNAVAILABLE");
  }
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function bounded(value, max) { return typeof value === "string" ? [...value.normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()].slice(0, max).join("") : ""; }

export function publicImport(record) {
  const { file_sha256_or_fixture_digest, preview_digest, confirmation_token_digest, error_sample_codes, ...safe } = record;
  return safe;
}
export function publicTree(record) { return sanitizeResponse(record); }
export function publicCandidate(record) {
  const { source_digest, ...safe } = record;
  return sanitizeResponse({ ...safe, label: safe.candidate_label ?? safe.label ?? "Synthetic viewer" });
}
export async function unavailable(getter) { try { const record = await getter(); return record || null; } catch { return null; } }
export async function deleteRecords(entity, records) { for (const record of records) if (record?.id) await entity.delete(record.id); }
export async function updateRecords(entity, records, payloadFor) {
  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) await Promise.all(records.slice(offset, offset + BATCH_SIZE).map((record) => entity.update(record.id, payloadFor(record))));
}

const CREATORS = ["Quiet Signal", "Studio Ember", "Night Archive", "Field Notes", "Long Light", "Small Frame"];
const pad = (value) => String(value).padStart(3, "0");
const at = (day, hour = 20, minute = 0) => new Date(Date.UTC(2026, 3, day, hour, minute)).toISOString();
function demoEvent(index, watchedAt, candidate = false, creatorOffset = 0) {
  return { source_platform: "synthetic_demo", source_type: "synthetic_demo", normalized_content_id: `demo:v1:video:${pad(index)}`, bounded_title: `Synthetic Scene ${pad(index)}`, bounded_creator_label: `${CREATORS[(index + creatorOffset) % CREATORS.length]} ${String((index % 18) + 1).padStart(2,"0")}`, canonical_public_url: "", watched_at: watchedAt, repeat_count: 1, first_watched_at: watchedAt, last_watched_at: watchedAt, occurrence_index: 1, same_second_ordinal: 0, visibility_state: candidate ? "matchable_private" : "owner_only", matching_enabled: candidate, sensitivity_excluded: false, exclusion_reason: "", optional_owner_note: "", normalization_version: "demo-v1", canonicalization_version: "demo-content-v1", is_synthetic: true, fixture_id: FIXTURE_ID, schema_version: 1, source_ordinal: 0, creator_key: `demo:v1:creator:${(index + creatorOffset) % CREATORS.length}` };
}
function decorate(events) { const groups = new Map(); for (const event of events) { const list = groups.get(event.normalized_content_id) ?? []; list.push(event); groups.set(event.normalized_content_id, list); } for (const list of groups.values()) { list.sort((a,b)=>a.watched_at.localeCompare(b.watched_at)); list.forEach((event,index)=>{event.repeat_count=list.length;event.first_watched_at=list[0].watched_at;event.last_watched_at=list.at(-1).watched_at;event.occurrence_index=index+1;}); } return events.sort((a,b)=>a.watched_at.localeCompare(b.watched_at)); }
export function demoEventsA() { const events=[]; for(let id=1;id<=30;id++){const watched=id===3?at(7,19):id===4?at(7,20):id===5?at(7,21):at(1+id*2,8+(id%12),(id*7)%60);events.push(demoEvent(id,watched,false,0));} [1,2,3,4,1,2,3,4,9,10,12,14,16,18,20,22,24,26].forEach((id,index)=>events.push(demoEvent(id,at(63+index,18+(index%5),(index*11)%60),false,0))); return decorate(events).slice(0,48); }
function candidate(id,label,exact,repeated,start,shift,path=[]) { const events=[]; exact.forEach((content,index)=>{const p=path.indexOf(content);events.push(demoEvent(content,p>=0?at(8,19+p):at(2+index*3,9+(index%10)),true,0));}); repeated.forEach((content,index)=>events.push(demoEvent(content,at(65+index,20),true,0))); let next=start;while(events.length<46){events.push(demoEvent(next,at(3+(events.length%82),7+(events.length%15)),true,shift));next+=1;if(next>80)next=start;}return{id,label,synthetic_label:"Synthetic viewer · competition demo",events:decorate(events.slice(0,46))}; }
export const SYNTHETIC_CANDIDATES = [candidate("viewer-b","Viewer B · Same quiet arc",[1,2,3,4,5,6,7,8],[1,2,3,4],31,0,[3,4,5]),candidate("viewer-c","Viewer C · Repeated night path",[2,3,4,5,9,12],[2,3],45,2,[3,4,5]),candidate("viewer-d","Viewer D · Adjacent creator trail",[1,3,9,11],[1],58,4,[])];
const eligible=(event)=>!event.sensitivity_excluded&&event.matching_enabled!==false;
const setOf=(events)=>new Set(events.filter(eligible).map((event)=>event.normalized_content_id));
const inter=(a,b)=>[...a].filter((item)=>b.has(item));
const counts=(events)=>{const map=new Map();for(const event of events.filter(eligible))map.set(event.normalized_content_id,(map.get(event.normalized_content_id)??0)+1);return map;};
function paths(events){const sorted=events.filter(eligible).slice().sort((a,b)=>a.watched_at.localeCompare(b.watched_at));const bi=new Set(),tri=new Set();for(let i=0;i<sorted.length-1;i++){const gap=(new Date(sorted[i+1].watched_at)-new Date(sorted[i].watched_at))/36e5;if(gap<=24)bi.add(`${sorted[i].normalized_content_id}>${sorted[i+1].normalized_content_id}`);}for(let i=0;i<sorted.length-2;i++){const g1=(new Date(sorted[i+1].watched_at)-new Date(sorted[i].watched_at))/36e5,g2=(new Date(sorted[i+2].watched_at)-new Date(sorted[i+1].watched_at))/36e5;if(g1<=24&&g2<=24&&g1+g2<=72)tri.add(`${sorted[i].normalized_content_id}>${sorted[i+1].normalized_content_id}>${sorted[i+2].normalized_content_id}`);}return{bi,tri};}
function rhythm(events){const bins=Array(28).fill(0);for(const event of events.filter(eligible)){const date=new Date(event.watched_at),h=date.getUTCHours(),part=h<6?0:h<12?1:h<18?2:3;bins[date.getUTCDay()*4+part]+=1;}const norm=Math.hypot(...bins)||1;return bins.map((n)=>n/norm);}
const cosine=(a,b)=>Math.max(0,Math.min(1,a.reduce((sum,value,index)=>sum+value*b[index],0)));
export function buildTree(events){const active=events.filter((event)=>!event.sensitivity_excluded);const creators=new Map();for(const event of active){const key=event.bounded_creator_label||"Creator unavailable";const item=creators.get(key)??{label:key,count:0,ids:new Set()};item.count+=1;item.ids.add(event.normalized_content_id);creators.set(key,item);}return{eligible_event_count:active.length,unique_content_count:new Set(active.map((event)=>event.normalized_content_id)).size,creator_clusters:[...creators.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,50).map((item)=>({label:item.label,count:item.count,unique:item.ids.size})),repeat_signal_count:[...counts(active).values()].filter((n)=>n>1).length,viewing_rhythm:rhythm(active),rarity_signal_count:0,excluded_count:events.length-active.length,generated_at:new Date(0).toISOString(),matching_version:MATCHING_VERSION};}
export function scoreCandidate(ownerEvents,candidate,corpus=SYNTHETIC_CANDIDATES){const a=setOf(ownerEvents),b=setOf(candidate.events),shared=inter(a,b);const exact=shared.length/Math.max(1,Math.min(a.size,b.size));const sets=[...corpus.map((item)=>setOf(item.events)),a];const idf=(id)=>Math.max(1,Math.min(4,1+Math.log((sets.length+1)/(sets.filter((items)=>items.has(id)).length+1))));const rarity=shared.reduce((sum,id)=>sum+idf(id),0)/Math.max(.0001,Math.min([...a].reduce((sum,id)=>sum+idf(id),0),[...b].reduce((sum,id)=>sum+idf(id),0)));const ac=counts(ownerEvents),bc=counts(candidate.events),union=new Set([...ac.keys(),...bc.keys()]);const g=(n)=>1+Math.min(2,Math.log(Math.max(1,n)));let rn=0,rd=0;for(const id of union){rn+=Math.min(g(ac.get(id)??0),g(bc.get(id)??0));rd+=Math.max(g(ac.get(id)??0),g(bc.get(id)??0));}const repeated=rd?rn/rd:0;const ap=paths(ownerEvents),bp=paths(candidate.events),sharedBi=inter(ap.bi,bp.bi).length,sharedTri=inter(ap.tri,bp.tri).length,seq=(sharedBi+1.5*sharedTri)/Math.max(1,new Set([...ap.bi,...bp.bi]).size+1.5*new Set([...ap.tri,...bp.tri]).size);const creatorA=new Set(ownerEvents.filter(eligible).map((e)=>e.creator_key||e.bounded_creator_label)),creatorB=new Set(candidate.events.filter(eligible).map((e)=>e.creator_key||e.bounded_creator_label)),creator=inter(creatorA,creatorB).length/Math.max(1,new Set([...creatorA,...creatorB]).size);const temporal=cosine(rhythm(ownerEvents),rhythm(candidate.events));const difference=creator>0?Math.max(0,1-exact):0;const score=.25*exact+.25*rarity+.15*repeated+.15*seq+.08*creator+.07*temporal+.05*difference;const rare=shared.filter((id)=>sets.filter((items)=>items.has(id)).length<=2).length;return{id:candidate.id,label:candidate.label,synthetic_label:candidate.synthetic_label,score:Number(score.toFixed(6)),score_band:score>=.45?"distinctive":score>=.28?"strong":"emerging",exact_overlap_count:shared.length,rare_overlap_count:rare,repeated_overlap_count:shared.filter((id)=>(ac.get(id)??0)>1&&(bc.get(id)??0)>1).length,shared_path_count:sharedBi+sharedTri,meaningful_difference_present:difference>.15,evidence_tokens:[{id:`${candidate.id}:exact`,type:"exact",label:"Exact overlap",count:shared.length},{id:`${candidate.id}:rare`,type:"rare",label:"Rare signal",count:rare},{id:`${candidate.id}:path`,type:"path",label:"Shared path",count:sharedBi+sharedTri},{id:`${candidate.id}:difference`,type:"difference",label:"Meaningful difference",count:difference>.15?1:0}]};}
export function orderCandidates(events){return SYNTHETIC_CANDIDATES.map((candidate)=>scoreCandidate(events,candidate)).sort((a,b)=>b.score-a.score||b.rare_overlap_count-a.rare_overlap_count||b.shared_path_count-a.shared_path_count||b.exact_overlap_count-a.exact_overlap_count||a.id.localeCompare(b.id));}

export async function decorateStoredEvent(event, importId, ordinal) {
  return{...event,bounded_title:bounded(event.bounded_title,240)||"Untitled video",bounded_creator_label:bounded(event.bounded_creator_label,160),canonical_public_url:bounded(event.canonical_public_url,512),optional_owner_note:bounded(event.optional_owner_note,500),import_id:importId,source_ordinal:ordinal,canonicalization_version:event.canonicalization_version||"youtube-id-v1",schema_version:1};
}

export async function createMatchSignal(event, importId) {
  const identity=`${event.source_platform}|${event.normalized_content_id}`;
  const match_key=await digestHex(`match-v1|${identity}`);
  const record_key=await digestHex(`record-v1|${identity}|${event.watched_at}|${event.same_second_ordinal??0}`);
  return {
    import_id: importId,
    match_key,
    record_key,
    normalized_content_id: event.normalized_content_id,
    watched_at: event.watched_at,
    schema_version: 1
  };
}
