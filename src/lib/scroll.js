export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function getMatchMedia(matchMedia) {
  if (typeof matchMedia === "function") return matchMedia;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia.bind(window);
}

export function getScrollBehavior(matchMedia) {
  const resolvedMatchMedia = getMatchMedia(matchMedia);
  if (!resolvedMatchMedia) return "auto";

  try {
    return resolvedMatchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth";
  } catch {
    return "auto";
  }
}

export function scrollElementIntoView(
  element,
  { block, inline, matchMedia } = {},
) {
  if (!element || typeof element.scrollIntoView !== "function") return false;

  element.scrollIntoView({
    behavior: getScrollBehavior(matchMedia),
    ...(block ? { block } : {}),
    ...(inline ? { inline } : {}),
  });
  return true;
}

export function scrollToElementById(id, options) {
  if (typeof document === "undefined" || typeof id !== "string") return false;
  return scrollElementIntoView(document.getElementById(id), options);
}
