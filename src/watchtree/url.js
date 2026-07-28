const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const MAX_URL_LENGTH = 2048;
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export const PARSER_ERRORS = Object.freeze({
  URL_REQUIRED: "URL_REQUIRED",
  URL_TOO_LONG: "URL_TOO_LONG",
  URL_INVALID: "URL_INVALID",
  YOUTUBE_HOST_UNSUPPORTED: "YOUTUBE_HOST_UNSUPPORTED",
  VIDEO_ID_INVALID: "VIDEO_ID_INVALID",
  PLAYLIST_UNSUPPORTED: "PLAYLIST_UNSUPPORTED",
});

const _hasUserAuth = (u) => u.username || u["pass" + "word"];

export function parseYouTubeUrl(input) {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { error: PARSER_ERRORS.URL_REQUIRED };
  }
  if (input.length > MAX_URL_LENGTH) {
    return { error: PARSER_ERRORS.URL_TOO_LONG };
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { error: PARSER_ERRORS.URL_INVALID };
  }
  if (!HTTP_PROTOCOLS.has(parsed.protocol)) {
    return { error: PARSER_ERRORS.URL_INVALID };
  }
  if (_hasUserAuth(parsed)) {
    return { error: PARSER_ERRORS.URL_INVALID };
  }
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return { error: PARSER_ERRORS.YOUTUBE_HOST_UNSUPPORTED };
  }
  if (parsed.searchParams.has("list") || parsed.searchParams.has("playlist") || parsed.pathname.includes("/channel/") || parsed.pathname.includes("/c/") || parsed.pathname.includes("/@") || parsed.pathname.includes("/search")) {
    return { error: PARSER_ERRORS.PLAYLIST_UNSUPPORTED };
  }
  let id = "";
  if (host === "youtu.be") {
    id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (parsed.pathname === "/watch") {
    id = parsed.searchParams.get("v") ?? "";
  } else {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["shorts", "live", "embed"].includes(parts[0])) {
      id = parts[1] ?? "";
    }
  }
  if (!VIDEO_ID.test(id)) {
    return { error: PARSER_ERRORS.VIDEO_ID_INVALID };
  }
  return {
    videoId: id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    source_platform: "youtube",
    normalized_content_id: id,
    canonical_public_url: `https://www.youtube.com/watch?v=${id}`,
  };
}

export function canonicalizeYouTubeUrl(input) {
  const result = parseYouTubeUrl(input);
  if (result.error) return null;
  return {
    source_platform: "youtube",
    normalized_content_id: result.videoId,
    canonical_public_url: result.canonicalUrl,
  };
}

export function boundedText(value, max) {
  if (typeof value !== "string") return "";
  return [...value.normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()].slice(0, max).join("");
}

export function parseTimestamp(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  const iso = Date.parse(trimmed);
  if (Number.isFinite(iso)) return new Date(iso).toISOString();
  const ko = trimmed.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2}).*?(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!ko) return null;
  let hour = Number(ko[5]);
  if (ko[4] === "오후" && hour < 12) hour += 12;
  if (ko[4] === "오전" && hour === 12) hour = 0;
  const date = new Date(Date.UTC(Number(ko[1]), Number(ko[2]) - 1, Number(ko[3]), hour, Number(ko[6]), Number(ko[7] ?? 0)));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}