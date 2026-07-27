import { createClientFromRequest } from "npm:@base44/sdk";
import {
  authenticate,
  fail,
  json,
  sanitizeResponse,
} from "./_shared/watchtree.js";
import {
  BATCH_SIZE,
  boundedError,
  reconcileImports,
  reconcileOrphans,
  reconcilePartial,
  validateAction,
  validateEntity,
  validateOwnerId,
} from "./_shared/reconcile.js";

Deno.serve(async (req) => {
  // Method guard
  if (req.method !== "POST") {
    return json({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  }

  // Content type guard
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return fail("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  // Authenticate
  const base44 = createClientFromRequest(req);
  const user = await authenticate(base44);
  if (!user) return fail("AUTH_REQUIRED", 401);

  // Parse input
  let input;
  try {
    input = await req.json();
  } catch {
    return fail("JSON_INVALID", 400);
  }

  // Validate client nonce
  if (!input.client_nonce || typeof input.client_nonce !== "string" || input.client_nonce.length < 8) {
    return fail("INVALID_CLIENT_NONCE", 400);
  }

  // Validate action
  if (!validateAction(input.action)) {
    return fail("ACTION_UNSUPPORTED", 400);
  }

  // Enforce caller-owner boundary
  const ownerId = input.owner_id ?? user.id;
  if (!validateOwnerId(ownerId)) {
    return fail("OWNER_ID_INVALID", 400);
  }
  // Only allow the authenticated user's own data
  if (ownerId !== user.id) {
    return fail("OWNER_ID_MISMATCH", 403);
  }

  // Entity allowlist enforcement
  if (input.entity && !validateEntity(input.entity)) {
    return fail("ENTITY_UNSUPPORTED", 400);
  }

  try {
    let result;
    switch (input.action) {
      case "reconcile_import": {
        result = await reconcileImports(base44, ownerId, input.cursor ?? null);
        break;
      }
      case "reconcile_orphans": {
        result = await reconcileOrphans(base44, ownerId);
        break;
      }
      case "reconcile_partial": {
        result = await reconcilePartial(base44, ownerId, input.client_nonce ?? null);
        break;
      }
      default: {
        return fail("ACTION_UNSUPPORTED", 400);
      }
    }

    return json({
      ok: true,
      action: input.action,
      owner_id: ownerId,
      result: sanitizeResponse(result),
      idempotent: false,
    });
  } catch (error) {
    const message = error?.message ?? "UNKNOWN";
    // Do NOT log private data: title, creator, source path, hash, or raw data
    return json(
      boundedError("INTERNAL", "Reconciliation failed"),
      500,
    );
  }
});
