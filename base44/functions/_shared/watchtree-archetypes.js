export const SCORE_WEIGHTS = {
  exact: 0.25, rarity: 0.25, repeated: 0.15, sequence: 0.15,
  creator: 0.08, temporal: 0.07, difference: 0.05
};
export const MIN_EVENTS_FOR_MATCHING = 4;

const CREATORS = ["Quiet Signal", "Studio Ember", "Night Archive", "Field Notes", "Long Light", "Small Frame"];
const pad = (value) => String(value).padStart(3, "0");
const at = (day, hour = 20, minute = 0) => new Date(Date.UTC(2026, 3, day, hour, minute)).toISOString();
function demoEvent(index, watchedAt, candidate = false, creatorOffset = 0) {
  return { source_platform: "synthetic_demo", source_type: "synthetic_demo", normalized_content_id: `demo:v1:video:${pad(index)}`, bounded_title: `Synthetic Scene ${pad(index)}`, bounded_creator_label: `${CREATORS[(index + creatorOffset) % CREATORS.length]} ${String((index % 18) + 1).padStart(2,"0")}`, canonical_public_url: "", watched_at: watchedAt, repeat_count: 1, first_watched_at: watchedAt, last_watched_at: watchedAt, occurrence_index: 1, same_second_ordinal: 0, visibility_state: candidate ? "matchable_private" : "owner_only", matching_enabled: candidate, sensitivity_excluded: false, exclusion_reason: "", optional_owner_note: "", normalization_version: "demo-v1", canonicalization_version: "demo-content-v1", is_synthetic: true, fixture_id: "watchtree-demo-v1", schema_version: 1, source_ordinal: 0, creator_key: `demo:v1:creator:${(index + creatorOffset) % CREATORS.length}` };
}
function decorate(events) { const groups = new Map(); for (const event of events) { const list = groups.get(event.normalized_content_id) ?? []; list.push(event); groups.set(event.normalized_content_id, list); } for (const list of groups.values()) { list.sort((a,b)=>a.watched_at.localeCompare(b.watched_at)); list.forEach((event,index)=>{event.repeat_count=list.length;event.first_watched_at=list[0].watched_at;event.last_watched_at=list.at(-1).watched_at;event.occurrence_index=index+1;}); } return events.sort((a,b)=>a.watched_at.localeCompare(b.watched_at)); }
function demoCandidate(id,label,exact,repeated,start,shift,path=[]) { const events=[]; exact.forEach((content,index)=>{const p=path.indexOf(content);events.push(demoEvent(content,p>=0?at(8,19+p):at(2+index*3,9+(index%10)),true,0));}); repeated.forEach((content,index)=>events.push(demoEvent(content,at(65+index,20),true,0))); let next=start;while(events.length<46){events.push(demoEvent(next,at(3+(events.length%82),7+(events.length%15)),true,shift));next+=1;if(next>80)next=start;}return{id,label,synthetic_label:"Synthetic viewer · competition demo",events:decorate(events.slice(0,46))}; }

export const SYNTHETIC_CANDIDATES = [
  demoCandidate("viewer-b","Viewer B · Same quiet arc",[1,2,3,4,5,6,7,8],[1,2,3,4],31,0,[3,4,5]),
  demoCandidate("viewer-c","Viewer C · Repeated night path",[2,3,4,5,9,12],[2,3],45,2,[3,4,5]),
  demoCandidate("viewer-d","Viewer D · Adjacent creator trail",[1,3,9,11],[1],58,4,[]),
  { id: "archetype-quiet-rewatcher", label: "Quiet Rewatcher · 조용한 반복 감상자", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-night-documentary", label: "Night Documentary Explorer · 심야 다큐 탐험가", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-learning-trail", label: "Learning Trail Builder · 학습 경로 수집가", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-music-loop", label: "Music Loop Listener · 음악 반복 청취자", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-longform-cinema", label: "Long-form Cinema Viewer · 장편 영상 감상자", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-creator-loyalist", label: "Creator Loyalist · 특정 크리에이터 집중형", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-rabbit-hole", label: "Topic Rabbit-hole Explorer · 연관 주제 탐험형", synthetic_label: "Synthetic archetype · 시청 유형", events: [] },
  { id: "archetype-eclectic-wanderer", label: "Eclectic Wanderer · 다양한 주제 유랑형", synthetic_label: "Synthetic archetype · 시청 유형", events: [] }
];

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

export function extractFeatures(events) {
  const active = events.filter(eligible);
  const total = active.length;
  if (total === 0) return null;

  const countMap = new Map();
  const channels = new Map();
  let short = 0, med = 0, long = 0;
  const categories = new Map();
  const words = new Map();
  let wordTotal = 0;
  const bins = Array(28).fill(0);
  let transitions = 0;

  for (let i = 0; i < total; i++) {
    const e = active[i];
    countMap.set(e.normalized_content_id, (countMap.get(e.normalized_content_id) || 0) + 1);
    
    const channel = e.creator_key || e.bounded_creator_label || "unknown";
    channels.set(channel, (channels.get(channel) || 0) + 1);

    const d = e.duration_seconds || 0;
    if (d > 0) {
      if (d < 300) short++;
      else if (d < 1200) med++;
      else long++;
    }

    const cat = String(e.category_id || "unknown");
    if (cat !== "unknown") categories.set(cat, (categories.get(cat) || 0) + 1);

    const title = (e.bounded_title || "").toLowerCase().replace(/[^a-z0-9가-힣\s]/g, "");
    for (const w of title.split(/\s+/)) {
      if (w.length > 2) {
        words.set(w, (words.get(w) || 0) + 1);
        wordTotal++;
      }
    }

    const date = new Date(e.watched_at);
    if (!isNaN(date)) {
      const h = date.getUTCHours();
      const part = h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3;
      bins[date.getUTCDay() * 4 + part]++;
    }

    if (i > 0) {
      const prevChannel = active[i - 1].creator_key || active[i - 1].bounded_creator_label || "unknown";
      if (channel !== prevChannel) transitions++;
    }
  }

  const repeatRatio = Array.from(countMap.values()).filter(c => c > 1).reduce((s, c) => s + c, 0) / total;
  const channelConcentration = channels.size > 0 ? Math.max(...channels.values()) / total : 0;
  const channelDiversity = channels.size / total;
  const durTotal = short + med + long;
  const durationDist = durTotal > 0 ? [short/durTotal, med/durTotal, long/durTotal] : [0,0,0];
  const topCategoryRatio = categories.size > 0 ? Math.max(...categories.values()) / total : 0;
  const topWordRatio = wordTotal > 0 ? Math.max(...words.values()) / wordTotal : 0;
  const rhythmNorm = Math.hypot(...bins) || 1;
  const rhythmVector = bins.map(v => v / rhythmNorm);
  const transitionRate = total > 1 ? transitions / (total - 1) : 0;

  return { repeatRatio, channelConcentration, channelDiversity, durationDist, topCategoryRatio, topWordRatio, rhythm: rhythmVector, transitionRate };
}

export function scoreArchetype(features, candidateId) {
  if (!features) return 0;
  let score = 0;
  const { repeatRatio, channelConcentration, channelDiversity, durationDist, topCategoryRatio, topWordRatio, rhythm, transitionRate } = features;
  
  if (candidateId === "archetype-quiet-rewatcher") {
    score = repeatRatio * 0.5 + channelConcentration * 0.5;
  } else if (candidateId === "archetype-night-documentary") {
    const nightRhythm = rhythm.slice(0, 7).reduce((a, b) => a + b, 0); // simplistic night check
    score = durationDist[2] * 0.5 + nightRhythm * 0.5;
  } else if (candidateId === "archetype-learning-trail") {
    score = topCategoryRatio * 0.4 + topWordRatio * 0.4 + (1 - transitionRate) * 0.2;
  } else if (candidateId === "archetype-music-loop") {
    score = repeatRatio * 0.4 + durationDist[0] * 0.3 + topCategoryRatio * 0.3;
  } else if (candidateId === "archetype-longform-cinema") {
    score = durationDist[2] * 0.7 + (1 - channelDiversity) * 0.3;
  } else if (candidateId === "archetype-creator-loyalist") {
    score = channelConcentration * 0.8 + repeatRatio * 0.2;
  } else if (candidateId === "archetype-rabbit-hole") {
    score = transitionRate * 0.5 + topCategoryRatio * 0.5;
  } else if (candidateId === "archetype-eclectic-wanderer") {
    score = channelDiversity * 0.6 + transitionRate * 0.4;
  }
  return Math.min(1, Math.max(0, score));
}

export function buildEvidenceTokens(candidate, shared, rareCount, seq, sharedCreators, ac, bc, difference, features, archScore) {
  const tokens = [];
  if (candidate.id.startsWith("archetype-")) {
    if (features) {
      if (features.repeatRatio > 0) tokens.push({ id: `${candidate.id}:repeat`, type: "repeat", label: "Repeated views", count: Math.round(features.repeatRatio * 100) });
      if (features.channelConcentration > 0) tokens.push({ id: `${candidate.id}:channel`, type: "channel", label: "Channel focus", count: Math.round(features.channelConcentration * 100) });
      if (features.channelDiversity > 0) tokens.push({ id: `${candidate.id}:diversity`, type: "diversity", label: "Channel diversity", count: Math.round(features.channelDiversity * 100) });
    }
  } else {
    if (shared.length > 0) tokens.push({ id: `${candidate.id}:exact`, type: "exact", label: "Exact overlap", count: shared.length });
    if (rareCount > 0) tokens.push({ id: `${candidate.id}:rare`, type: "rare", label: "Rare signal", count: rareCount });
    const pathCount = seq.sharedBigrams + seq.sharedTrigrams;
    if (pathCount > 0) tokens.push({ id: `${candidate.id}:path`, type: "path", label: "Shared path", count: pathCount });
    if (difference > 0.15) tokens.push({ id: `${candidate.id}:difference`, type: "difference", label: "Meaningful difference", count: 1 });
    const creatorCount = sharedCreators.length;
    if (creatorCount > 0) tokens.push({ id: `${candidate.id}:creator`, type: "rare", label: "Shared creator", count: creatorCount });
    const repeatedCount = shared.filter((id) => (ac.get(id) ?? 0) > 1 && (bc.get(id) ?? 0) > 1).length;
    if (repeatedCount > 0) tokens.push({ id: `${candidate.id}:repeated`, type: "rare", label: "Repeated together", count: repeatedCount });
  }
  return tokens.slice(0, 6);
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
  let score=Object.entries(SCORE_WEIGHTS).reduce((sum,[key,weight])=>sum+components[key]*weight,0);
  
  const rareCount=shared.filter((id)=>corpusEvents.filter((s)=>s.has(id)).length<=2).length;
  
  let features = null;
  if (candidate.id.startsWith("archetype-")) {
    features = extractFeatures(ownerEvents);
    score = scoreArchetype(features, candidate.id);
  }

  return {
    id:candidate.id,label:candidate.label,synthetic_label:candidate.synthetic_label,
    score:Number(score.toFixed(6)), score_band:score>=0.45?"distinctive":score>=0.28?"strong":"emerging",
    exact_overlap_count:shared.length, rare_overlap_count:rareCount,
    repeated_overlap_count:shared.filter((id)=>(ac.get(id)??0)>1&&(bc.get(id)??0)>1).length,
    shared_path_count:seq.sharedBigrams+seq.sharedTrigrams,
    meaningful_difference_present:difference>0.15,
    evidence_tokens: buildEvidenceTokens(candidate, shared, rareCount, seq, sharedCreators, ac, bc, difference, features, score),
    components,
  };
}

export function orderCandidates(ownerEvents, candidates = SYNTHETIC_CANDIDATES) {
  const activeEvents = ownerEvents.filter(eligible);
  if (activeEvents.length < MIN_EVENTS_FOR_MATCHING) return [];
  const scored = candidates
    .map((candidate) => scoreCandidate(ownerEvents, candidate, candidates))
    .sort((a, b) => b.score - a.score || b.rare_overlap_count - a.rare_overlap_count || b.shared_path_count - a.shared_path_count || b.exact_overlap_count - a.exact_overlap_count || a.id.localeCompare(b.id));
  
  // Rule: "4개 이상이더라도 실제 신호가 약하면 insufficient"
  // If the top score is below strong threshold (0.28), return empty (insufficient)
  if (scored.length > 0 && scored[0].score < 0.28) {
    return [];
  }
  
  return scored.slice(0, 3);
}
