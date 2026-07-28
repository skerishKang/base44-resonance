import { buildWatchTree, orderCandidates } from "../../src/watchtree/matching.js";
import { createDemoFixture } from "../../src/watchtree/fixtures.js";

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
      if(action==="enable_import_matching"){state.matchingEnabled=true;state.import.matching_enabled=true;state.events=state.events.map((e)=>({...e,matching_enabled:true,visibility_state:"matchable_private"}));return rebuild();}
      if(action==="disable_import_matching"){state.matchingEnabled=false;state.import.matching_enabled=false;state.events=state.events.map((e)=>({...e,matching_enabled:false}));state.candidates=[];state.consent=null;state.mutual=null;persist();return clone(state);}
      if(action==="exclude_event")state.events=state.events.map((e)=>e.id===payload.event_id?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="exclude_creator")state.events=state.events.map((e)=>e.bounded_creator_label===payload.creator_label?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="exclude_date_range")state.events=state.events.map((e)=>e.watched_at.slice(0,10)>=payload.from&&e.watched_at.slice(0,10)<=payload.to?{...e,sensitivity_excluded:true,matching_enabled:false}:e);
      if(action==="delete_import"||action==="delete_all"){state={import:null,events:[],tree:null,candidates:[],consent:null,mutual:null,matchingEnabled:false};sessionStorage.removeItem(storageKey);return {...clone(state),complete:true};}
      state.consent=null;state.mutual=null;
      return rebuild();
    },
  };
}
