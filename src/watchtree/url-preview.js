const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

export function normalizeYouTubeUrlInput(value) {
  return String(value ?? "").trim();
}

function normalizedHost(hostname) {
  return String(hostname ?? "").toLowerCase().replace(/^www\./, "");
}

export function isResolvableYouTubeUrl(value) {
  const normalized = normalizeYouTubeUrlInput(value);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = normalizedHost(url.hostname);
    if (!YOUTUBE_HOSTS.has(host)) return false;

    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean).length > 0;
    if (url.pathname === "/watch") return Boolean(url.searchParams.get("v"));
    return /^\/(shorts|live|embed)\/[^/]+/.test(url.pathname);
  } catch {
    return false;
  }
}

export function createLatestUrlRequestGate() {
  let sequence = 0;
  let activeToken = null;

  return {
    begin(value) {
      const url = normalizeYouTubeUrlInput(value);
      if (!url || activeToken?.url === url) return null;
      activeToken = Object.freeze({ sequence: sequence += 1, url });
      return activeToken;
    },
    invalidate() {
      sequence += 1;
      activeToken = null;
    },
    isCurrent(token, currentValue) {
      return Boolean(
        token
        && activeToken
        && token.sequence === activeToken.sequence
        && token.url === activeToken.url
        && token.url === normalizeYouTubeUrlInput(currentValue)
      );
    },
    settle(token) {
      if (activeToken?.sequence === token?.sequence) activeToken = null;
    },
  };
}
