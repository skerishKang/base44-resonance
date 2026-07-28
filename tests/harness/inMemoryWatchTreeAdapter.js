import { buildWatchTree, orderCandidates } from "../../src/watchtree/matching.js";
import { createDemoFixture } from "../../src/watchtree/fixtures.js";
import { parseYouTubeUrl } from "../../src/watchtree/url.js";

const clone=(value)=>structuredClone(value);
const assignIds=(events,importId)=>events.map((event,index)=>({...event,id:`evt_${index+1}`,import_id:importId}));
export function createInMemoryWatchTreeAdapter(storageKey="watchtree-test-state"){
  let state={import:null,events:[],tree:null,candidates:[],consent:null,mutual:null,matchingEnabled:false};
  const persist=()=>sessionStorage.setItem(storageKey,JSON.stringify(state));
  const restoreStored=()=>{try{return JSON.parse(sessionStorage.getItem(storageKey)||"null");}catch{return null;}};
  const rebuild=()=>{state.tree=state.events.length?{id:"tree_1",...buildWatchTree(state.events)}:null;state.candidates=state.matchingEnabled?orderCandidates(state.events,createDemoFixture().candidates):[];persist();return clone(state);};
  return {
    kind:"in-memory-test-only",
    async restore(){state=restoreStored()??state;return clone(state);},
    async seedDemo(){const fixture=createDemoFixture();const importId="imp_demo";state={import:{id:importId,status:"completed",source_type:"synthetic_demo",is_synthetic:true,matching_enabled:false},events:assignIds(fixture.events,importId),tree:null,candidates:[],consent:null,mutual:null,matchingEnabled:false};return rebuild();},
    async validatePreview(payload){return {confirmation_token:`confirm_${payload.file_sha256.slice(0,12)}`,records:clone(payload.records),counts:payload.counts,errors:[]};},
    async commitPreview(payload){const importId="imp_import";state={import:{id:importId,status:"completed",source_type:payload.source_type,is_synthetic:false,matching_enabled:false},events:assignIds(payload.records,importId),tree:null,candidates:[],consent:null,mutual:null,matchingEnabled:false};return rebuild();},
    async buildTree(){rebuild();return {tree:clone(state.tree),events:clone(state.events)};},
    async findCandidates(){state.candidates=orderCandidates(state.events,createDemoFixture().candidates);persist();return {candidates:clone(state.candidates)};},
    async setConsent(candidateId,tokens,action){state.consent=action==="revoke"?{candidate_id:candidateId,state:"revoked",selected_evidence_tokens:[]}:{id:"consent_1",candidate_id:candidateId,state:"granted",selected_evidence_tokens:[...tokens]};if(action==="revoke")state.mutual=null;persist();return {consent:clone(state.consent)};},
    async simulateMutual(candidateId){state.mutual={id:"mutual_1",candidate_id:candidateId,state:"mutual",is_simulated:true,message:"Two synthetic paths now resonate."};persist();return {mutual:clone(state.mutual)};},
    async mutatePrivacy(action,payload){
      if(action==="enable_import_matching"){state.matchingEnabled=true;state.import.matching_enabled=true;state.events=state.events.map((e)=>({...e,matching_enabled:true,visibility_state:"matchable_private"}));return {...rebuild(),complete:true};}
      if(action==="disable_import_matching"){state.matchingEnabled=false;state.import.matching_enabled=false;state.events=state.events.map((e)=>({...e,matching_enabled:false}));state.candidates=[];state.consent=null;state.mutual=null;persist();return {...clone(state),complete:true};}
      if(action==="exclude_event")state.events=state.events.map((e)=>e.id===payload.event_id?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="exclude_creator")state.events=state.events.map((e)=>e.bounded_creator_label===payload.creator_label?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="exclude_date_range")state.events=state.events.map((e)=>e.watched_at.slice(0,10)>=payload.from&&e.watched_at.slice(0,10)<=payload.to?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="delete_import"||action==="delete_all"){state={import:null,events:[],tree:null,candidates:[],consent:null,mutual:null,matchingEnabled:false};sessionStorage.removeItem(storageKey);return {...clone(state),complete:true};}
      state.consent=null;state.mutual=null;
      return {...rebuild(),complete:true};
    },
    async resolveYouTubeVideo(videoUrl){
      const parsed=parseYouTubeUrl(videoUrl);
      if(parsed.error)return{ok:true,metadata:{video_id:parsed.error,videoUrl},confirmation_token:"mock_token"};
      return {ok:true,metadata:{video_id:parsed.videoId,canonical_url:parsed.canonicalUrl,bounded_title:`Test Video ${parsed.videoId.slice(0,6)}`,channel_id:"UC-mock",bounded_creator_label:"Test Channel",published_at:"2024-01-01T00:00:00.000Z",duration_seconds:180,category_id:"22",thumbnail_url:"",embeddable:true,privacy_status:"public"},confirmation_token:`confirm_${parsed.videoId}`};
    },
    async addWatchUrlEvent(payload){
      const existingImport=state.import?.source_type==="url_collection"?state.import:null;
      let importId=existingImport?.id??"imp_url";
      if(!existingImport){
        state.import={id:importId,status:"completed",source_type:"url_collection",source_platform:"youtube",is_synthetic:false,matching_enabled:false,client_nonce:"test-nonce",file_sha256_or_fixture_digest:"url-collection-v1",normalization_version:"yt-takeout-v1",record_count:0,accepted_count:0,excluded_count:0,rejected_count:0,committed_count:0,consent_version:"watchtree-consent-v1",source_disposition:"browser_local_not_uploaded",schema_version:1};
      }
      const eventId=`evt_${state.events.length+1}`;
      const event={id:eventId,source_platform:"youtube",source_type:"url_collection",normalized_content_id:payload.videoId,bounded_title:`Test Video ${payload.videoId.slice(0,6)}`,bounded_creator_label:"Test Channel",canonical_public_url:`https://www.youtube.com/watch?v=${payload.videoId}`,watched_at:payload.watchedAt??new Date().toISOString(),repeat_count:1,first_watched_at:payload.watchedAt??new Date().toISOString(),last_watched_at:payload.watchedAt??new Date().toISOString(),occurrence_index:1,same_second_ordinal:0,visibility_state:"owner_only",matching_enabled:false,sensitivity_excluded:false,exclusion_reason:"",optional_owner_note:payload.privateNote??"",import_id:importId,normalization_version:"yt-takeout-v1",canonicalization_version:"youtube-id-v1",creator_key:"youtube:channel:Test Channel",is_synthetic:false,schema_version:1,source_ordinal:state.events.length+1};
      state.events=[...state.events,event];
      state.import.committed_count=state.events.length;
      state.import.record_count=state.events.length;
      persist();
      return {ok:true,import:clone(state.import),event:clone(event)};
    },

    /**
     * In-memory mock for realtime subscription.
     * Stores the callback so tests can simulate WatchEvent changes.
     *
     * @param {(event: object) => void} callback
     * @returns {() => void} unsubscribe function
     */
    subscribe(callback) {
      state._realtimeCallbacks = state._realtimeCallbacks || [];
      state._realtimeCallbacks.push(callback);
      return () => {
        state._realtimeCallbacks = (state._realtimeCallbacks || []).filter((cb) => cb !== callback);
      };
    },
  };
}
