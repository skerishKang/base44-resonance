const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function boundedText(value, max) {
  if (typeof value !== "string") return "";
  return [...value.normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()].slice(0, max).join("");
}

export function canonicalizeYouTubeUrl(input) {
  if (typeof input !== "string" || input.length > 2048) return null;
  let parsed;
  try { parsed = new URL(input); } catch { return null; }
  if (parsed.protocol !== "https:" || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  let id = "";
  if (parsed.hostname.toLowerCase() === "youtu.be") id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  else if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") ?? "";
  else {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["shorts", "live", "embed"].includes(parts[0])) id = parts[1] ?? "";
  }
  if (!VIDEO_ID.test(id)) return null;
  return {
    source_platform: "youtube",
    normalized_content_id: id,
    canonical_public_url: `https://www.youtube.com/watch?v=${id}`,
  };
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
