import { SCORE_WEIGHTS } from "./constants.js";

const set = (events) => new Set(events.filter(eligible).map((e) => e.normalized_content_id));
const eligible = (event) => !event.sensitivity_excluded && event.matching_enabled !== false;
const intersection = (a, b) => [...a].filter((value) => b.has(value));
const jaccard = (a, b) => { const union = new Set([...a, ...b]); return union.size ? intersection(a, b).length / union.size : 0; };
const clamp = (value) => Math.max(0, Math.min(1, value));

function counts(events) {
  const map = new Map();
  for (const event of events.filter(eligible)) map.set(event.normalized_content_id, (map.get(event.normalized_content_id) ?? 0) + 1);
  return map;
}

function creatorWeights(events) {
  const map = new Map();
  for (const event of events.filter(eligible)) {
    const key = event.creator_key ?? event.bounded_creator_label ?? "unknown";
    const entry = map.get(key) ?? { ids: new Set(), total: 0 };
    entry.ids.add(event.normalized_content_id); entry.total += 1; map.set(key, entry);
  }
  const weighted = new Map();
  for (const [key, value] of map) weighted.set(key, 0.7 * Math.log1p(value.ids.size) + 0.3 * Math.log1p(value.total));
  return weighted;
}

function weightedJaccard(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let numerator = 0, denominator = 0;
  for (const key of keys) { numerator += Math.min(a.get(key) ?? 0, b.get(key) ?? 0); denominator += Math.max(a.get(key) ?? 0, b.get(key) ?? 0); }
  return denominator ? numerator / denominator : 0;
}

function rhythm(events) {
  const bins = Array(28).fill(0);
  for (const event of events.filter(eligible)) {
    const date = new Date(event.watched_at); if (!Number.isFinite(date.getTime())) continue;
    const h = date.getUTCHours(); const part = h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3;
    bins[date.getUTCDay() * 4 + part] += 1;
  }
  const norm = Math.hypot(...bins) || 1; return bins.map((v) => v / norm);
}
function cosine(a, b) { return clamp(a.reduce((sum, v, i) => sum + v * b[i], 0)); }

function paths(events) {
  const sorted = events.filter(eligible).slice().sort((a,b)=>a.watched_at.localeCompare(b.watched_at));
  const bigrams = new Set(); const trigrams = new Set();
  for (let i=0;i<sorted.length-1;i++) {
    const gap=(new Date(sorted[i+1].watched_at)-new Date(sorted[i].watched_at))/36e5;
    if (gap<=24) bigrams.add(`${sorted[i].normalized_content_id}>${sorted[i+1].normalized_content_id}`);
  }
  for (let i=0;i<sorted.length-2;i++) {
    const g1=(new Date(sorted[i+1].watched_at)-new Date(sorted[i].watched_at))/36e5;
    const g2=(new Date(sorted[i+2].watched_at)-new Date(sorted[i+1].watched_at))/36e5;
    if (g1<=24 && g2<=24 && g1+g2<=72) trigrams.add(`${sorted[i].normalized_content_id}>${sorted[i+1].normalized_content_id}>${sorted[i+2].normalized_content_id}`);
  }
  return { bigrams, trigrams };
}

function sequenceScore(aEvents,bEvents) {
  const a=paths(aEvents), b=paths(bEvents);
  const numerator=intersection(a.bigrams,b.bigrams).length + 1.5*intersection(a.trigrams,b.trigrams).length;
  const unionBig=new Set([...a.bigrams,...b.bigrams]).size;
  const unionTri=new Set([...a.trigrams,...b.trigrams]).size;
  return { score:(unionBig+1.5*unionTri)?numerator/(unionBig+1.5*unionTri):0, sharedBigrams:intersection(a.bigrams,b.bigrams).length, sharedTrigrams:intersection(a.trigrams,b.trigrams).length };
}

export function scoreCandidate(ownerEvents, candidate, corpus = []) {
  const a=set(ownerEvents), b=set(candidate.events);
  const shared=intersection(a,b);
  const exact=shared.length/Math.max(1,Math.min(a.size,b.size));
  const corpusEvents=[...corpus.map((c)=>set(c.events)),a];
  const idf=(id)=>Math.max(1,Math.min(4,1+Math.log((corpusEvents.length+1)/((corpusEvents.filter((s)=>s.has(id)).length)+1))));
  const denom=Math.max(0.0001,Math.min([...a].reduce((s,id)=>s+idf(id),0),[...b].reduce((s,id)=>s+idf(id),0)));
  const rarity=shared.reduce((s,id)=>s+idf(id),0)/denom;
  const ac=counts(ownerEvents), bc=counts(candidate.events); const union=new Set([...ac.keys(),...bc.keys()]);
  let repN=0,repD=0; const g=(f)=>1+Math.min(2,Math.log(Math.max(1,f)));
  for(const id of union){repN+=Math.min(g(ac.get(id)??0),g(bc.get(id)??0));repD+=Math.max(g(ac.get(id)??0),g(bc.get(id)??0));}
  const repeated=repD?repN/repD:0;
  const seq=sequenceScore(ownerEvents,candidate.events);
  const creator=weightedJaccard(creatorWeights(ownerEvents),creatorWeights(candidate.events));
  const temporal=cosine(rhythm(ownerEvents),rhythm(candidate.events));
  let difference=0;
  const sharedCreators=intersection(new Set(creatorWeights(ownerEvents).keys()),new Set(creatorWeights(candidate.events).keys()));
  for(const key of sharedCreators){
    const as=new Set(ownerEvents.filter((e)=>eligible(e)&&(e.creator_key??e.bounded_creator_label)===key).map((e)=>e.normalized_content_id));
    const bs=new Set(candidate.events.filter((e)=>eligible(e)&&(e.creator_key??e.bounded_creator_label)===key).map((e)=>e.normalized_content_id));
    if(as.size>=2&&bs.size>=2) difference=Math.max(difference,(1-jaccard(as,bs))*Math.min(1,Math.min(as.size,bs.size)/3));
  }
  const components={exact,rarity,repeated,sequence:seq.score,creator,temporal,difference};
  const score=Object.entries(SCORE_WEIGHTS).reduce((sum,[key,weight])=>sum+components[key]*weight,0);
  const rareCount=shared.filter((id)=>corpusEvents.filter((s)=>s.has(id)).length<=2).length;
  return {
    id:candidate.id,label:candidate.label,synthetic_label:candidate.synthetic_label,
    score:Number(score.toFixed(6)), score_band:score>=0.45?"distinctive":score>=0.28?"strong":"emerging",
    exact_overlap_count:shared.length, rare_overlap_count:rareCount,
    repeated_overlap_count:shared.filter((id)=>(ac.get(id)??0)>1&&(bc.get(id)??0)>1).length,
    shared_path_count:seq.sharedBigrams+seq.sharedTrigrams,
    meaningful_difference_present:difference>0.15,
    evidence_tokens:[
      {id:`${candidate.id}:exact`,type:"exact",label:"Exact overlap",count:shared.length},
      {id:`${candidate.id}:rare`,type:"rare",label:"Rare signal",count:rareCount},
      {id:`${candidate.id}:path`,type:"path",label:"Shared path",count:seq.sharedBigrams+seq.sharedTrigrams},
      {id:`${candidate.id}:difference`,type:"difference",label:"Meaningful difference",count:difference>0.15?1:0},
    ],
    components,
  };
}

export function orderCandidates(ownerEvents,candidates){return candidates.map((candidate)=>scoreCandidate(ownerEvents,candidate,candidates)).sort((a,b)=>b.score-a.score||b.rare_overlap_count-a.rare_overlap_count||b.shared_path_count-a.shared_path_count||b.exact_overlap_count-a.exact_overlap_count||a.id.localeCompare(b.id));}

export function buildWatchTree(events){
  const active=events.filter((e)=>!e.sensitivity_excluded);
  const creators=new Map(); for(const event of active){const key=event.bounded_creator_label||"Unknown creator";const entry=creators.get(key)??{label:key,count:0,ids:new Set()};entry.count+=1;entry.ids.add(event.normalized_content_id);creators.set(key,entry);}
  return {eligible_event_count:active.length,unique_content_count:new Set(active.map((e)=>e.normalized_content_id)).size,creator_clusters:[...creators.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,12).map((x)=>({label:x.label,count:x.count,unique:x.ids.size})),repeat_signal_count:[...counts(active).values()].filter((n)=>n>1).length,viewing_rhythm:rhythm(active),generated_at:new Date(0).toISOString(),matching_version:"watchtree-match-v1"};
}
