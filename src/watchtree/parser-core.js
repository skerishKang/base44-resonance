import { LIMITS, VISIBILITY } from "./constants.js";
import { boundedText, canonicalizeYouTubeUrl, parseTimestamp } from "./url.js";

export class WatchHistoryParseError extends Error {
  constructor(code, details = {}) { super(code); this.name = "WatchHistoryParseError"; this.code = code; this.details = details; }
}

export function detectFormat(fileName, mime = "") {
  const lower = String(fileName ?? "").toLowerCase();
  const type = String(mime ?? "").toLowerCase();
  if (lower.endsWith(".json") && ["", "application/json", "text/json", "text/plain"].includes(type)) return "json";
  if ((lower.endsWith(".html") || lower.endsWith(".htm")) && ["", "text/html", "application/xhtml+xml", "text/plain"].includes(type)) return "html";
  return null;
}

export function jsonDepth(value, depth = 0) {
  if (depth > LIMITS.maxJsonDepth) return depth;
  if (!value || typeof value !== "object") return depth;
  let max = depth;
  for (const next of Array.isArray(value) ? value : Object.values(value)) max = Math.max(max, jsonDepth(next, depth + 1));
  return max;
}

function creatorFromSubtitles(value) {
  if (typeof value === "string") return boundedText(value, LIMITS.creator);
  if (!Array.isArray(value)) return "";
  for (const item of value) {
    if (typeof item === "string") { const text = boundedText(item, LIMITS.creator); if (text) return text; }
    if (item && typeof item === "object") { const text = boundedText(item.name ?? item.title ?? "", LIMITS.creator); if (text) return text; }
  }
  return "";
}

function cleanTitle(value) {
  let text = boundedText(value, LIMITS.title);
  for (const prefix of ["Watched ", "시청함: ", "시청한 동영상: "]) if (text.startsWith(prefix)) text = text.slice(prefix.length).trim();
  return text || "Untitled video";
}

function normalizeRecord(record, ordinal, sourceType) {
  if (!record || typeof record !== "object") return { status: "rejected", code: "MALFORMED_RECORD", ordinal };
  const url = record.titleUrl ?? record.url ?? record.href ?? "";
  const canonical = canonicalizeYouTubeUrl(url);
  if (!canonical) return { status: "excluded", code: url ? "URL_INVALID" : "URL_MISSING", ordinal };
  const watchedAt = parseTimestamp(record.time ?? record.timestamp ?? record.datetime ?? "");
  if (!watchedAt) return { status: "rejected", code: "TIMESTAMP_MISSING", ordinal };
  const productText = JSON.stringify([record.header, record.products, record.activityControls]).toLowerCase();
  if (productText && !productText.includes("youtube") && sourceType !== "google_takeout_html") return { status: "excluded", code: "NON_VIDEO_ACTIVITY", ordinal };
  const title = cleanTitle(record.title ?? record.text ?? "");
  if (/deleted|unavailable|삭제|사용할 수 없/i.test(title)) return { status: "excluded", code: "DELETED_OR_UNAVAILABLE", ordinal };
  return {
    status: "accepted",
    event: {
      source_platform: canonical.source_platform,
      source_type: sourceType,
      normalized_content_id: canonical.normalized_content_id,
      bounded_title: title,
      bounded_creator_label: creatorFromSubtitles(record.subtitles ?? record.creator ?? ""),
      canonical_public_url: canonical.canonical_public_url,
      watched_at: watchedAt,
      repeat_count: 1,
      first_watched_at: watchedAt,
      last_watched_at: watchedAt,
      occurrence_index: 1,
      same_second_ordinal: 0,
      visibility_state: VISIBILITY.ownerOnly,
      matching_enabled: false,
      sensitivity_excluded: false,
      optional_owner_note: "",
      normalization_version: "yt-takeout-v1",
      schema_version: 1,
      source_ordinal: ordinal,
    },
  };
}

export function parseJsonText(text) {
  let root;
  try { root = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new WatchHistoryParseError("JSON_MALFORMED"); }
  if (!Array.isArray(root)) throw new WatchHistoryParseError("SCHEMA_UNSUPPORTED");
  if (root.length > LIMITS.maxRecords) throw new WatchHistoryParseError("RECORD_LIMIT_EXCEEDED", { count: root.length });
  if (jsonDepth(root) > LIMITS.maxJsonDepth) throw new WatchHistoryParseError("JSON_DEPTH_EXCEEDED");
  return summarize(root.map((record, index) => normalizeRecord(record, index, "google_takeout_json")));
}

// Bounded, deterministic HTML5-like tokenizer. It never creates a live DOM,
// executes script, resolves resources, or uses DOMParser.
export function tokenizeHtml(input) {
  const tokens = [];
  let i = 0;
  let nodes = 0;
  const pushText = (text) => { const value = boundedText(text, 2_000); if (value) tokens.push({ type: "text", value }); };
  while (i < input.length) {
    if (input[i] !== "<") {
      const next = input.indexOf("<", i);
      pushText(input.slice(i, next === -1 ? input.length : next));
      i = next === -1 ? input.length : next;
      continue;
    }
    if (input.startsWith("<!--", i)) { const end = input.indexOf("-->", i + 4); i = end === -1 ? input.length : end + 3; continue; }
    const end = input.indexOf(">", i + 1);
    if (end === -1) throw new WatchHistoryParseError("HTML_MALFORMED");
    const raw = input.slice(i + 1, end).trim();
    i = end + 1;
    if (!raw || raw[0] === "!") continue;
    const closing = raw[0] === "/";
    const body = closing ? raw.slice(1).trim() : raw;
    const nameMatch = body.match(/^([A-Za-z0-9:-]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].toLowerCase();
    nodes += 1;
    if (nodes > LIMITS.maxHtmlNodes) throw new WatchHistoryParseError("HTML_NODE_LIMIT_EXCEEDED");
    const attrs = {};
    if (!closing) {
      let cursor = nameMatch[0].length;
      while (cursor < body.length) {
        while (/\s/.test(body[cursor] ?? "")) cursor += 1;
        const keyMatch = body.slice(cursor).match(/^([A-Za-z_:][A-Za-z0-9:._-]*)/);
        if (!keyMatch) { cursor += 1; continue; }
        const key = keyMatch[1].toLowerCase(); cursor += keyMatch[0].length;
        while (/\s/.test(body[cursor] ?? "")) cursor += 1;
        let value = "";
        if (body[cursor] === "=") {
          cursor += 1; while (/\s/.test(body[cursor] ?? "")) cursor += 1;
          const quote = body[cursor];
          if (quote === '"' || quote === "'") { const close = body.indexOf(quote, cursor + 1); value = body.slice(cursor + 1, close === -1 ? body.length : close); cursor = close === -1 ? body.length : close + 1; }
          else { const valueMatch = body.slice(cursor).match(/^[^\s]+/); value = valueMatch?.[0] ?? ""; cursor += value.length; }
        }
        if (!key.startsWith("on") && key !== "srcdoc") attrs[key] = boundedText(value, 2_048);
      }
    }
    tokens.push({ type: closing ? "end" : "start", name, attrs });
  }
  return tokens;
}

export function parseHtmlText(text) {
  const tokens = tokenizeHtml(text.replace(/^\uFEFF/, ""));
  const stack = [];
  const records = [];
  const emittedAnchors = new WeakSet();
  const blocked = new Set(["script", "style", "iframe", "object", "embed"]);
  const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  let skipDepth = 0;
  const current = () => stack[stack.length - 1];
  for (const token of tokens) {
    if (token.type === "start") {
      if (blocked.has(token.name)) { skipDepth += 1; continue; }
      if (skipDepth) continue;
      const node = { name: token.name, attrs: token.attrs, text: "", anchors: [], times: [] };
      if (!voidElements.has(token.name)) stack.push(node);
      if (token.name === "a" && token.attrs.href) node.anchors.push({ href: token.attrs.href, text: "" });
      if (token.name === "time" && token.attrs.datetime) node.times.push(token.attrs.datetime);
      continue;
    }
    if (token.type === "text") {
      if (skipDepth) continue;
      for (const node of stack) {
        node.text = boundedText(`${node.text} ${token.value}`, 8_000);
        const last = node.anchors[node.anchors.length - 1];
        if (last) last.text = boundedText(`${last.text} ${token.value}`, LIMITS.title);
      }
      continue;
    }
    if (blocked.has(token.name) && skipDepth) { skipDepth -= 1; continue; }
    if (skipDepth) continue;
    let node;
    do { node = stack.pop(); } while (node && node.name !== token.name);
    if (!node) continue;
    const parent = current();
    if (parent) {
      parent.text = boundedText(`${parent.text} ${node.text}`, 8_000);
      parent.anchors.push(...node.anchors);
      parent.times.push(...node.times);
    }
    if (["div", "li", "section", "article", "body"].includes(node.name)) {
      for (const anchor of node.anchors) {
        if (emittedAnchors.has(anchor)) continue;
        const canonical = canonicalizeYouTubeUrl(anchor.href);
        if (!canonical) continue;
        const isoInText = node.text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/i)?.[0];
        const watchedAt = node.times.map(parseTimestamp).find(Boolean) ?? parseTimestamp(isoInText ?? node.text);
        if (!watchedAt) continue;
        records.push({
          titleUrl: anchor.href,
          title: anchor.text || node.text.slice(0, LIMITS.title),
          creator: "",
          time: watchedAt,
          header: "YouTube",
          activityControls: ["YouTube watch history"],
        });
        emittedAnchors.add(anchor);
      }
    }
  }
  const deduped = [...new Map(records.map((record) => [`${record.titleUrl}|${record.time}`, record])).values()];
  if (!deduped.length) throw new WatchHistoryParseError("SCHEMA_UNSUPPORTED");
  if (deduped.length > LIMITS.maxRecords) throw new WatchHistoryParseError("RECORD_LIMIT_EXCEEDED", { count: records.length });
  return summarize(deduped.map((record, index) => normalizeRecord(record, index, "google_takeout_html")));
}

function summarize(results) {
  const events = [];
  const errors = [];
  const counts = { accepted: 0, excluded: 0, rejected: 0 };
  for (const result of results) {
    counts[result.status] += 1;
    if (result.status === "accepted") events.push(result.event);
    else if (errors.length < LIMITS.errorSamples) errors.push({ ordinal: result.ordinal, code: result.code });
  }
  if (counts.rejected > LIMITS.maxRejected) throw new WatchHistoryParseError("REJECTION_LIMIT_EXCEEDED", counts);
  assignRepeatMetadata(events);
  return { events, counts, errors };
}

export function assignRepeatMetadata(events) {
  const groups = new Map();
  for (const event of events) {
    const key = `${event.source_platform}|${event.normalized_content_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.watched_at.localeCompare(b.watched_at) || a.source_ordinal - b.source_ordinal);
    const first = group[0].watched_at;
    const last = group[group.length - 1].watched_at;
    const sameSecond = new Map();
    group.forEach((event, index) => {
      const second = event.watched_at.slice(0, 19);
      const ordinal = sameSecond.get(second) ?? 0;
      sameSecond.set(second, ordinal + 1);
      event.repeat_count = group.length;
      event.first_watched_at = first;
      event.last_watched_at = last;
      event.occurrence_index = index + 1;
      event.same_second_ordinal = ordinal;
    });
  }
}
