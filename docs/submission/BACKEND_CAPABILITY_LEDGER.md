# Backend Capability Ledger — Resonance / 공명

Base44 capabilities audited for the Build-Off submission build. Status values: `VERIFIED_PRODUCTION` (deployed and active), `MERGED_NOT_DEPLOYED` (merged to main, not yet deployed), `EXPERIMENTAL_PR` (branch-only, not merged), `ROADMAP_ONLY` (planned post-submission), `NOT_USED` (decided against).

---

## Authentication & user management

| Field | Value |
|-------|-------|
| **Status** | `VERIFIED_PRODUCTION` |
| **Implementation** | Base44 Auth via `createClientFromRequest(req)` and `base44.auth.me()`. The SDK extracts caller identity from request context — no credentials, tokens, or passwords exposed in application code. |
| **Judge-visible proof** | Every Function entrypoint calls `authenticate(base44)` and returns `AUTH_REQUIRED (401)` when unauthenticated. AuthPanel component renders sign-in/sign-up forms. Production site requires authentication to enter WatchTree. |
| **Source path** | `base44/functions/*/entry.ts` — authenticated guard in all 13 Functions (12 deployed, 1 merged not deployed). `src/lib/AuthPanel.jsx` — Auth UI. |
| **Merged SHA** | `7a16adb` — current main. |
| **Production verification** | Production App at `base44-resonance-40117c91.base44.app` requires authentication. Final release deployment will reconfirm before submission deadline. |
| **Submission checkbox eligible** | Yes, after deployed release confirmation. |
| **Notes** | No service role used. No custom Auth provider. No email exposure in response payloads. |

---

## Database / Entities

| Field | Value |
|-------|-------|
| **Status** | `VERIFIED_PRODUCTION` (capability); PR #37 schema delta (`url_collection`, `metadata_provenance`, `client_nonce_digest`, `payload_digest`) is `MERGED_NOT_DEPLOYED` |
| **Implementation** | 13 Entity schemas defined in `base44/entities/*.jsonc`. All use Base44's `created_by_id` Row-Level Security: create allowed for authenticated `user` and `admin` roles; read, update, delete restricted to owner scope. No Entity uses `read: true`, public mutation, client-controlled owner fields, or browser service-role paths. |
| **Judge-visible proof** | Entity schema files checked into repository. `base44/entities/` directory contains 13 JSONC files, each with identical RLS pattern. |
| **Source path** | `base44/entities/*.jsonc` (13 files). |
| **Merged SHA** | `959afdc` — all 13 schemas present. |
| **Production verification** | Previous Entity baseline deployed and active. PR #37 additive schema fields not yet deployed. Final release will reconfirm before submission. |
| **Submission checkbox eligible** | Yes, after deployed release confirmation of the full schema set. |
| **Notes** | Entities: `CapabilityProbe`, `ConsentRecord`, `ImportChunkReceipt`, `MatchDecision`, `MemoryCard`, `MutualResonance`, `RevealConsent`, `SharedPathCandidate`, `WatchEvent`, `WatchImport`, `WatchMatchSignal`, `WatchTreeFingerprint`, `ResonanceFingerprint`. Two Entities (`ConsentRecord`, `MemoryCard`) are deployed but unused by current product — retained for deployment compatibility. |

---

## Backend Functions (Deno)

| Field | Value |
|-------|-------|
| **Status** | `VERIFIED_PRODUCTION` (capability, 12-function production baseline); `add-watch-url-event` is `MERGED_NOT_DEPLOYED` |
| **Implementation** | 13 caller-scoped Deno Functions in source (12 deployed baseline + 1 merged not deployed), each wrapping `Deno.serve(async (req) => { const base44 = createClientFromRequest(req); ... })`. Uniform entrypoint pattern: POST + JSON guard, request body size limit (192KB), caller authentication, nonce validation, deterministic logic, standardized `json()`/`fail()` response format. Shared modules (`watchtree.js`, `sanitizer.js`, `watchtree-archetypes.js`, `reconcile.js`) vendored from canonical `_shared/` directory with SHA-256 enforced parity. |
| **Judge-visible proof** | All 13 `entry.ts` files in `base44/functions/*/`. CI runs `check:base44-shared` and bundle boundary test to verify vendored module consistency. |
| **Source path** | `base44/functions/*/entry.ts` (13 files). Shared: `base44/functions/_shared/`. |
| **Merged SHA** | `959afdc` — all 13 function sources present. 12-function production baseline at previous deployment; `add-watch-url-event` merged but not yet deployed. |
| **Production verification** | 12-function baseline deployed and active. `add-watch-url-event` not yet deployed. Final release deployment will reconfirm. |
| **Submission checkbox eligible** | Yes, after deployed release confirmation of all 13 functions. |
| **Notes** | Functions: `add-watch-url-event` (MERGED_NOT_DEPLOYED), `build-watch-tree`, `commit-watch-import`, `compute-matches` (vestigial), `delete-watch-data`, `find-shared-paths`, `generate-fingerprint` (vestigial), `parse-watch-history`, `reconcile-watch-data`, `seed-demo-history`, `set-reveal-consent`, `simulate-mutual`, `verify-capability` (vestigial). No function uses service role, live AI, Agents, or raw authentication material. The `resolve-youtube-video` function was removed from the submission build (API key dependency). |

---

## AI / LLM / Agents

| Field | Value |
|-------|-------|
| **Status** | `ROADMAP_ONLY` |
| **Implementation** | WatchTree matching is entirely deterministic — no runtime AI, no LLM inference, no Base44 AI call capability. The initial product concept included AI fingerprint generation (`generate-fingerprint` function), but the product pivoted away from AI dependency. Base44 Agents were documented but not evaluated within the Build-Off timeline. |
| **Judge-visible proof** | `matching.js` and `watchtree-archetypes.js` contain only deterministic scoring functions — no AI model invocation, no LLM prompt, no AI SDK import. |
| **Source path** | `src/watchtree/matching.js`, `base44/functions/_shared/watchtree-archetypes.js`. |
| **Merged SHA** | Not applicable — not implemented. |
| **Production verification** | Production site matching produces identical results across reloads (deterministic). |
| **Submission checkbox eligible** | No — explicitly scoped out. Product is intentionally AI-free for auditability. |
| **Notes** | Future roadmap: Agent evaluation tracked in Issue #43. Current product is stronger for NOT using AI in matching — every candidate score is reproducible and explainable. |

---

## Realtime subscriptions

| Field | Value |
|-------|-------|
| **Status** | `MERGED_NOT_DEPLOYED` |
| **Implementation** | Caller-scoped `base44.entities.WatchEvent.subscribe(callback)` with 200ms debounced caller-scoped restore. Session-object identity isolation prevents stale callbacks after account or session replacement. Pending subscribe cleanup, unsubscribe on unmount/logout/session replacement, and subscription failure fallback are all implemented. No Function or Entity mutation occurs from the callback. |
| **Judge-visible proof** | `src/watchtree/realtime/createWatchTreeRealtime.js`, `src/watchtree/productionAdapter.js`, `src/watchtree/WatchTreeExperience.jsx`, `tests/watchtree-realtime.test.mjs` (12 focused lifecycle scenarios). |
| **Source path** | `src/watchtree/realtime/createWatchTreeRealtime.js`, `src/watchtree/productionAdapter.js`. |
| **Merged SHA** | `7a16adbd977ff5f2df2ceb2acc4130d242606dec` (PR #45 squash merge). |
| **Production verification** | Not deployed or authenticated-UAT verified yet. |
| **Submission checkbox eligible** | No — check only after exact Production deployment and authenticated two-tab UAT. |
| **Notes** | Issue #41 completed through PR #45. Source merged; Production verification pending. |

---

## File & media storage

| Field | Value |
|-------|-------|
| **Status** | `NOT_USED` |
| **Implementation** | WatchTree does not store uploaded files. Raw watch-history files (HTML/JSON) are parsed entirely inside a dedicated browser Worker and zeroed after parsing. The Worker enforces 8 MiB, 5,000-record, JSON-depth, HTML-node, and 8-second budgets. Emitted records are bounded normalized previews — never raw source content. URL collection does not involve file upload at all. |
| **Judge-visible proof** | No file upload endpoints exist in any Function. `source_disposition: "browser_local_not_uploaded"` on every `WatchImport` record from Takeout import. URL input stores only canonical URL and video ID — no file transfer. |
| **Source path** | `src/watchtree/watch-history.worker.js` — browser Worker. |
| **Merged SHA** | `959afdc`. |
| **Production verification** | Worker runs in production site. Network tab shows no file uploads to Base44. |
| **Submission checkbox eligible** | No — the product does not use Base44 File & media storage. Raw watch-history files are parsed in a browser Worker and never uploaded. |
| **Notes** | The privacy-by-design choice to keep raw data in the browser worker is stronger than uploading and trusting server-side deletion. |

---

## Capability summary

| Capability | Status | Judge-verifiable |
|------------|--------|-----------------|
| Authentication & user management | `VERIFIED_PRODUCTION` | AuthPanel UI, Function auth guards |
| Database / Entities | `VERIFIED_PRODUCTION` | 13 schema files, RLS declarations |
| Backend Functions (Deno) | `VERIFIED_PRODUCTION` (12-function baseline); `add-watch-url-event` `MERGED_NOT_DEPLOYED` | 13 entry.ts files (source), CI verifies shared module parity |
| AI / LLM / Agents | `ROADMAP_ONLY` | No AI imports in matching code |
| Realtime subscriptions | `MERGED_NOT_DEPLOYED` | `createWatchTreeRealtime.js`, `productionAdapter.js`, 12 lifecycle tests |
| File & media storage | `NOT_USED` | Worker-local parsing, no upload endpoints |

---

## Entities detail

| Entity | Active use | RLS pattern | Notes |
|--------|-----------|-------------|-------|
| `WatchImport` | Active | `created_by_id` | One per synthetic seed or URL collection owner |
| `WatchEvent` | Active | `created_by_id` | One per viewing occurrence |
| `WatchTreeFingerprint` | Active | `created_by_id` | Computed tree state |
| `SharedPathCandidate` | Active | `created_by_id` | Deterministic scoring output |
| `RevealConsent` | Active | `created_by_id` | Evidence consent record |
| `MutualResonance` | Active | `created_by_id` | Simulated mutual state |
| `WatchMatchSignal` | Active | `created_by_id` | Matching digest records |
| `ImportChunkReceipt` | Active | `created_by_id` | Takeout import chunk tracking |
| `CapabilityProbe` | Vestigial | `created_by_id` | Deployed, unused |
| `ConsentRecord` | Vestigial | `created_by_id` | Deployed, unused |
| `MatchDecision` | Vestigial | `created_by_id` | Deployed, unused |
| `MemoryCard` | Vestigial | `created_by_id` | Deployed, unused |
| `ResonanceFingerprint` | Vestigial | `created_by_id` | Deployed, unused |

---

## Functions detail

| Function | Role | Vestigial |
|----------|------|-----------|
| `add-watch-url-event` | URL collection commit | No |
| `build-watch-tree` | Tree computation after import | No |
| `commit-watch-import` | Takeout import commit | No |
| `compute-matches` | Legacy matching | Vestigial |
| `delete-watch-data` | Privacy deletion | No |
| `find-shared-paths` | Deterministic scoring | No |
| `generate-fingerprint` | Legacy fingerprint | Vestigial |
| `parse-watch-history` | Takeout preview | No |
| `reconcile-watch-data` | Orphan cleanup | No |
| `seed-demo-history` | Synthetic demo seed | No |
| `set-reveal-consent` | Consent recording | No |
| `simulate-mutual` | Mutual state simulation | No |
| `verify-capability` | Legacy probe | Vestigial |
