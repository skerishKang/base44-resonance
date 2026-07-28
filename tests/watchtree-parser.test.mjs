import assert from "node:assert/strict";
import test from "node:test";
import { detectFormat,jsonDepth,parseHtmlText,parseJsonText,tokenizeHtml,WatchHistoryParseError } from "../src/watchtree/parser-core.js";
import { canonicalizeYouTubeUrl } from "../src/watchtree/url.js";
import { readFileSync } from "node:fs";
import { LIMITS } from "../src/watchtree/constants.js";

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const json=fixture("watch-history.synthetic.json");
const html=fixture("watch-history.synthetic.html");

const unusedJson=JSON.stringify([{header:"YouTube",title:"Watched Synthetic Scene 001",titleUrl:"https://youtu.be/AbCdEfGhI01?si=tracking",subtitles:[{name:"Synthetic Creator"}],time:"2026-06-01T12:34:56.000Z",products:["YouTube"],activityControls:["YouTube watch history"]}]);
void unusedJson;

test("format and URL canonicalization are bounded",()=>{assert.equal(detectFormat("watch-history.json","application/json"),"json");assert.equal(detectFormat("watch-history.html","text/html"),"html");assert.equal(detectFormat("takeout.zip","application/zip"),null);assert.equal(canonicalizeYouTubeUrl("https://youtube.com/shorts/AbCdEfGhI01?si=x").normalized_content_id,"AbCdEfGhI01");assert.equal(canonicalizeYouTubeUrl("http://youtube.com/watch?v=AbCdEfGhI01").normalized_content_id,"AbCdEfGhI01");assert.equal(canonicalizeYouTubeUrl(""),null);});
test("JSON fixture normalizes one owner-only event",()=>{const result=parseJsonText(json);assert.equal(result.counts.accepted,2);assert.equal(result.events[0].bounded_title,"Synthetic Scene 001");assert.equal(result.events[0].matching_enabled,false);assert.equal(result.events[0].canonical_public_url,"https://www.youtube.com/watch?v=AbCdEfGhI01");});
test("HTML tokenizer is deterministic and does not require DOMParser",()=>{const tokens=tokenizeHtml(html);assert.ok(tokens.length>5);const result=parseHtmlText(html);assert.equal(result.counts.accepted,2);assert.equal(result.events[0].normalized_content_id,"AbCdEfGhI03");});
test("scripts are ignored and never executed",()=>{globalThis.__watchtreeExecuted=false;const result=parseHtmlText(html.replace("</body>","<script>globalThis.__watchtreeExecuted=true</script></body>"));assert.equal(result.counts.accepted,2);assert.equal(globalThis.__watchtreeExecuted,false);});
test("depth and record limits fail closed",()=>{let value={};let cursor=value;for(let i=0;i<LIMITS.maxJsonDepth+2;i++){cursor.next={};cursor=cursor.next;}assert.ok(jsonDepth(value)>LIMITS.maxJsonDepth);assert.throws(()=>parseJsonText(JSON.stringify(value)),(e)=>e instanceof WatchHistoryParseError);const huge=Array.from({length:LIMITS.maxRecords+1},()=>({}));assert.throws(()=>parseJsonText(JSON.stringify(huge)),(e)=>e.code==="RECORD_LIMIT_EXCEEDED");});
test("malformed input produces bounded codes",()=>{assert.throws(()=>parseJsonText(fixture("watch-history.malformed.json")),(e)=>e.code==="JSON_MALFORMED");assert.throws(()=>parseHtmlText(fixture("watch-history.malformed.html")),(e)=>e.code==="HTML_MALFORMED");});
