import { createClientFromRequest } from "npm:@base44/sdk";
import {
  json, fail, authenticate, requirePostJson, readInput, validNonce,
  parseYouTubeUrl, fetchYouTubeMetadata, buildYouTubeMetadataResponse,
  generateConfirmationToken, JSON_HEADERS,
} from "./_shared/watchtree.js";

Deno.serve(async (req) => {
  const guardError = await requirePostJson(req);
  if (guardError) return guardError;
  const base44 = createClientFromRequest(req);
  const user = await authenticate(base44);
  if (!user) return fail("AUTH_REQUIRED", 401, false);
  const input = await readInput(req);
  if (!input) return fail("REQUEST_TOO_LARGE", 413, false);
  if (!validNonce(input)) return fail("INVALID_CLIENT_NONCE", 400, false);
  const videoUrl = input.video_url ?? "";
  const parsed = parseYouTubeUrl(videoUrl);
  if (parsed.error) return fail(parsed.error, 400, false);
  let item;
  try {
    item = await fetchYouTubeMetadata(parsed.videoId);
  } catch (error) {
    if (error?.message === "VIDEO_UNAVAILABLE") return fail("VIDEO_UNAVAILABLE", 404, false);
    return fail("METADATA_LOOKUP_FAILED", 502, false);
  }
  const metadata = buildYouTubeMetadataResponse(item);
  const confirmationToken = await generateConfirmationToken(metadata);
  return json({
    ok: true,
    metadata,
    confirmation_token: confirmationToken,
  }, 200, JSON_HEADERS);
});