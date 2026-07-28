# Build Journal — Resonance / 공명

A chronological account of building **WatchTree** on Base44 with external agentic coding.

---

## Milestone 1: Initial Resonance concept and Base44 backend proof

**Date:** 2026-07-26

**Problem:** Enter the Base44 Dev Build-Off with a product that demonstrates the platform's relationship-oriented capabilities. Initial concept: **Memory Resonance** — a bilingual experience matching people through shared emotional interpretation of media fragments, using Base44 AI fingerprint generation.

**Decision:** Define initial base44 Entity prototypes and function proofs for the Memory Resonance concept. An accidental no-op file write (`f5a5e2d`) reached main, was immediately reverted (`61defea`) with zero tree change, and led to stricter PR-only integration discipline.

**Base44 capability used:** Entities with `created_by_id` RLS, Deno Functions with caller-scoped SDK client.

**Issue / PR / SHA:** Issue #1 — Build-Off MVP; no PR yet; early prototype baseline.

**Failure or risk:** The initial product had 11 screens, 9 entities, and AI fingerprinting — too broad to complete within the Build-Off deadline.

**Correction:** Pivoted to a scoped alternative.

**Verification evidence:** Repository scaffold with Vite build, initial CI passing, Entity schemas accepted by Base44.

**Product result:** Dual-path product option: keep Memory Resonance or switch to a bounded alternative.

**Next decision:** Evaluate WatchTree as an alternative.

---

## Milestone 2: WatchTree product pivot

**Date:** 2026-07-26

**Problem:** Memory Resonance required runtime AI fingerprint generation, realtime conversation state, and a complex multi-entity matching pipeline — too much surface area for a single Build-Off cycle.

**Decision:** Replace Memory Resonance with **WatchTree**, a privacy-first viewing-path experience. WatchTree turns the user's own YouTube viewing history into explainable synthetic resonance candidates using deterministic matching. No runtime AI, no real-person matching, no compatibility scores. The specification (Issue #20) defined the synthetic-only boundary and Takeout import path.

**Base44 capability used:** Entity schemas (WatchImport, WatchEvent, WatchTreeFingerprint, SharedPathCandidate, RevealConsent, MutualResonance, ImportChunkReceipt); caller-scoped Deno Functions (seed-demo-history, parse-watch-history, build-watch-tree, find-shared-paths, simulate-mutual).

**Issue / PR / SHA:** Issue #20 — Phase 3 WatchTree MVP.

**Failure or risk:** Large specification risked implementation delays. Not all 14 entities were immediately needed.

**Correction:** Prioritized 7 WatchTree-specific Entities and a deterministic matching demo. Realtime and message features deferred.

**Verification evidence:** Working demo with synthetic data, three candidate archetypes, reveal consent, and simulated mutual state.

**Product result:** WatchTree became the primary product direction. 13 Entity schemas and 12 Functions defined.

**Next decision:** Build the release CI and production validation pipeline.

---

## Milestone 3: 13 Entity schemas and RLS architecture

**Date:** 2026-07-26

**Problem:** Every Entity needed Base44's built-in `created_by_id` Row-Level Security. Create operations allowed for authenticated `user` and `admin` roles; read, update, and delete restricted to owner scope. No Entity could use `read: true`, public mutation, client-controlled owner fields, or browser service-role paths.

**Decision:** Define all 13 Entity schemas as `type: "object"` with Base44's declarative RLS: `read/update/delete` → `{ "created_by_id": "{{user.id}}" }`, `create` → `{ "$or": [{ "user_condition": { "role": "user" } }, { "user_condition": { "role": "admin" } }] }`. The Entities:

- `WatchImport` — resumable upload/synthetic seed session
- `WatchEvent` — single normalized viewing occurrence
- `WatchTreeFingerprint` — computed tree state
- `SharedPathCandidate` — synthetic matching result
- `RevealConsent` — user-granted evidence consent
- `MutualResonance` — simulated mutual state
- `WatchMatchSignal` — deterministic matching hash
- `ImportChunkReceipt` — chunk-level commit tracking
- `ConsentRecord`, `MemoryCard`, `ResonanceFingerprint`, `MatchDecision`, `CapabilityProbe` — retained from initial scope as deployment-compatible

**Base44 capability used:** Declarative RLS in Entity JSONC, owner-scoped `created_by_id` enforcement.

**Issue / PR / SHA:** Defined across Issue #1, #20; final count established by PR #32, base `61defea`.

**Failure or risk:** Some Entities (`ConsentRecord`, `MemoryCard`) are vestigial — unused by current product but deployed. Not removed because Live Entities are not deleted in production without data migration.

**Correction:** Accepted as harmless. Documentation marks them as deployment-compatible.

**Verification evidence:** Schema files under `base44/entities/*.jsonc`, all 13 use the identical `created_by_id` RLS pattern.

**Product result:** Stable, auditable owner-scoped data layer.

**Next decision:** Implement the Deno Function inventory.

---

## Milestone 4: Deno Function architecture and caller-scoped SDK

**Date:** 2026-07-26 – 2026-07-28

**Problem:** Each backend function needed authenticated caller identity, bounded request validation, and deterministic (non-AI) logic. Functions could not use service role, live AI, or Base44 Agents.

**Decision:** Build 13 caller-scoped Deno Functions following a uniform entrypoint pattern:

1. Import `createClientFromRequest` from `npm:@base44/sdk`
2. Wrap in `Deno.serve(async (req) => { ... })`
3. Guard: `requirePostJson(req)` validates POST + JSON + 192KB limit
4. Auth: `const base44 = createClientFromRequest(req)` then `authenticate(base44)` via `base44.auth.me()`
5. Input: `readInput(req)` parses pre-read bytes
6. Nonce: `validNonce(input)` rejects malformed client nonces
7. Execute bounded, deterministic logic
8. Return `json({ ok: true, ... })` or `fail(CODE, status, retryable)`

Shared modules (`watchtree.js`, `sanitizer.js`, `watchtree-archetypes.js`, `reconcile.js`) live in a canonical `_shared/` directory and are vendored to each Function by `sync-base44-function-shared.mjs`. The `check-base44-function-shared.mjs` script and a bundle boundary test enforce SHA-256 equality.

**Base44 capability used:** `createClientFromRequest`, `base44.auth.me()`, `base44.entities.*`, `base44.functions.invoke()`, `npm:@base44/sdk` import from Deno.

**Issue / PR / SHA:** All Functions across PR #32, #36, #37; final inventory at `959afdc`.

**Failure or risk:** Initial Functions used `context.base44` (invalid entrypoint pattern for Base44 functions). The AI CTO review caught this — converted all to `Deno.serve` + `createClientFromRequest`.

**Correction:** After first AI CTO review, all Functions were rewritten to the canonical pattern. Two new Functions (`resolve-youtube-video`, `add-watch-url-event`) were also converted and `resolve-youtube-video` was later removed.

**Verification evidence:** All 13 `entry.ts` files use `Deno.serve(async (req) => { const base44 = createClientFromRequest(req); ... })`.

**Product result:** Consistent, auditable function architecture. 10 Functions vendored from 4 canonical shared modules.

**Next decision:** Build the synthetic matching pipeline.

---

## Milestone 5: Synthetic-only matching

**Date:** 2026-07-26 – 2026-07-28

**Problem:** WatchTree needed to demonstrate meaningful resonance matching without scanning other users' data, without runtime AI, and without false claims of real-person connections.

**Decision:** Build a deterministic scoring engine (`watchtree-archetypes.js`) that compares the caller's eligible events against a versioned corpus of synthetic viewer profiles (`demo-corpus-v1`). The engine computes 7 weighted signals: exact overlap, rarity-weighted overlap, repeat/revisit overlap, sequential path similarity, creator-level adjacency, temporal rhythm cosine similarity, and meaningful content difference. No compatibility percentage or soulmate claim is rendered. Three initial competition demo candidates were expanded to 11 total (3 demo + 8 archetypes).

For API-key-free URL collections, a grounded 4-archetype subset is used: Quiet Rewatcher (repeat-based), Night Rhythm Viewer (time-based), Creator Focus (only when user provided non-empty creator labels), Eclectic Explorer (only when labels provide diversity). Duration/category/channel-dependent archetypes require verified data and are not returned for real no-key collections.

**Base44 capability used:** `orderCandidates` runs inside the `find-shared-paths` Function, creating `SharedPathCandidate` records with HMAC-deduplicated source digests.

**Issue / PR / SHA:** PR #37; base `a4975906a81eacfd2c07f7c9bd7a5ecc24bd569b`, reviewed head `cb385a56795a8d0a0918c5a4d0245e164f30e82d`, squash merge `959afdcc85e352665e58efc6394a0db91809ab5d`.

**Failure or risk:** Early backend had a hardcoded 10-unique-ID threshold that returned `NO_ELIGIBLE_EVENTS` for real URL collections. AI CTO review identified the incorrect threshold. Also, empty creator labels were counted as real creator buckets, producing false Creator Loyalist evidence.

**Correction:** Threshold lowered to `MIN_EVENTS_FOR_MATCHING = 4` for URL events. Empty creators excluded from channel metrics. Duration/category-dependent archetypes gated behind `hasDuration`. Grounded archetype set for real no-key collections.

**Verification evidence:** `tests/watchtree-no-key-matching.test.mjs` (8 tests) verifying grounded archetype behavior, empty creator handling, and source digest stability.

**Product result:** Truthful matching: no fake evidence, no unsupported claims, clear insufficient-signal state for low-information collections.

**Next decision:** Implement reveal consent and simulated mutual.

---

## Milestone 6: Reveal consent and simulated mutual

**Date:** 2026-07-27

**Problem:** Users must be able to select which evidence they are willing to reveal, record explicit consent, and inspect a mutual-resonance state — without actually contacting another user.

**Decision:** Implement `set-reveal-consent` Function that stores a `RevealConsent` record with the selected evidence token IDs. The `simulate-mutual` Function creates a `MutualResonance` record with `is_simulated: true` — clearly labeled as a simulation. The frontend prevents reveal without at least one evidence token selected, rejects token allowlist violations, and clears consent/mutual on any privacy mutation.

**Base44 capability used:** `RevealConsent` and `MutualResonance` Entities, caller-scoped `set-reveal-consent` and `simulate-mutual` Functions.

**Issue / PR / SHA:** Issue #20; PR #36; base `61defea`.

**Failure or risk:** Consent/mutual state could persist after privacy exclusions, creating stale frontend state.

**Correction:** Frontend invalidation added: privacy mutations clear `selectedTokens`, `consent`, and `mutual` immediately on success.

**Verification evidence:** Frontend tests for evidence token selection, consent payload filtering, and mutual state simulation.

**Product result:** Clear, auditable consent flow with explicit simulation labeling.

**Next decision:** Implement privacy lifecycle and bounded delete-all.

---

## Milestone 7: Privacy lifecycle and bounded delete-all

**Date:** 2026-07-28

**Problem:** The initial deletion path was a 20-record per-level capped cascade. A caller with 5000 events could not delete their data in a single session. The restore path was not scoped to the current import, so stale consent/mutual records from deleted imports could reappear.

**Decision:** Implement a budget-threaded deletion engine (`_shared/watchtree.js`) with per-call operation budget (`DELETE_BATCH_SIZE=50`, `DELETE_OPERATION_BUDGET=400`, `MAX_DELETE_ROUNDS=40`). Deletion is child-first sequential: mutual → consent per candidate, candidate → tree, tree → import. The import is deleted only after all children verify empty. A `delete_all` sweep includes orphan reconciliation across all 7 child Entities, with 8-collection empty verification. Restore is scoped per candidate via `restore.js`: latest completed import → active non-stale tree → per-candidate granted consent filter → latest grant by `created_date` with `candidate_rank`/`candidate_id` tie-break → mutual of selected candidate.

**Base44 capability used:** `WatchImport.delete()`, `WatchEvent.delete()`, `WatchTreeFingerprint.delete()`, `SharedPathCandidate.delete()`, `RevealConsent.delete()`, `MutualResonance.delete()`, `WatchMatchSignal.delete()`, `ImportChunkReceipt.delete()` — all caller-scoped via RLS.

**Issue / PR / SHA:** Issue #29; PR #36; base `61defea`, reviewed head `f68379e`, squash merge `a497590`.

**Failure or risk:** Sequential per-level deletion with budget exhaustion could leave a parent alive with children partially deleted. Next invocation re-lists from offset 0 so it rediscovers children via the surviving parent — no orphans.

**Correction:** AI CTO review identified that child deletion must complete before parent deletion. `drainWithChildren` was rewritten to return `complete: false` when budget runs out mid-child-deletion, retaining the parent.

**Verification evidence:** `tests/watchtree-privacy-lifecycle.test.mjs` (21-import multi-round deletion, 5000/5000 drain, single-call budget exhaustion, interrupted resume, query-spy scoped restore, 7-step regression).

**Product result:** Complete, resumable, auditable privacy lifecycle.

**Next decision:** Build production-capable release CI.

---

## Milestone 8: Production-capable release CI

**Date:** 2026-07-28

**Problem:** CI was running only on two feature branches and did not validate release builds. There was no enforcement of production App ID, no bundle verification, and no guarantee that the release build worked at all.

**Decision:** Overhaul CI into two jobs:
- **test-build-browser** (25 min): sync + shared module parity check + 265 deterministic tests + Vite build + Playwright browser validation.
- **release-build** (15 min): prove fail-closed behavior (build without App ID must fail), then build with production App ID (`6a6538c71a8e3e1640117c91`), run `check:release-bundle` verifying production ID presence and absence of validation/buildoff IDs, `localhost:4400`, `jsxDEV`. Upload bundle as artifact.

Both jobs trigger on PR and push to `main` plus two retained feature branches. CI never deploys, mutates secrets, calls live AI, or requires a Base44 token.

**Base44 capability used:** Production App ID binding via `VITE_BASE44_APP_ID` environment variable.

**Issue / PR / SHA:** Issue #30; PR #32; base `61defea`, reviewed head `39568f9`, squash merge `34fc099`.

**Failure or risk:** CI did not run on `main` pushes — merged PRs bypassed CI. `check:release-bundle` used `if-no-files-found: warn` (permissive).

**Correction:** CI trigger added for `main` pushes. Bundle upload changed to `if-no-files-found: error`. Release mode configured to fail closed when App ID is absent.

**Verification evidence:** CI runs 265 tests, browser validation, release build, and bundle verification. All PASS.

**Product result:** Production-quality CI pipeline. Release builds are gated, verified, and auditable.

**Next decision:** Implement API-key-free URL collection.

---

## Milestone 9: API-key-free URL collection

**Date:** 2026-07-28

**Problem:** The initial URL collection design required a server-side `YOUTUBE_API_KEY` for YouTube Data API metadata enrichment. This introduced a secret provisioning blocker, a platform dependency, and a non-starter for a submission build that had to work without external service credentials.

**Decision:** Remove all YouTube API key dependencies. The `resolve-youtube-video` Function (which called the YouTube Data API) was deleted. `add-watch-url-event` now parses and validates the URL server-side using only standard `URL` parsing — no external fetch, no API key, no scraping. User-entered title and creator labels are stored with `metadata_provenance: user_provided` (or `none` when absent). A future optional BYOK (Bring Your Own Key) enrichment is documented in Issue #38 but not implemented.

**Base44 capability used:** `add-watch-url-event` caller-scoped Function, WatchImport/WatchEvent Entities with `metadata_provenance` field, nonce-based per-event idempotency.

**Issue / PR / SHA:** Issue #33; PR #37; base `a497590`, reviewed head `cb385a5`, squash merge `959afdc`. **Note:** merged to main but not yet deployed to production.

**Failure or risk:** First implementation used `context.base44` (invalid entrypoint) and `YOUTUBE_API_KEY` in query string (credential exposure risk). AI CTO review caught both.

**Correction:** Rewritten to `Deno.serve` + `createClientFromRequest`. All YouTube API code removed. API key query-string usage eliminated. Confirmation token logic removed (not needed without API metadata).

**Verification evidence:** `tests/watchtree-url-parser.test.mjs` (21 URL format tests), `tests/watchtree-no-key-matching.test.mjs` (8 grounded archetype tests), 0 external fetch calls during URL add.

**Product result:** Fully self-contained URL collection. No external service dependency. 265 tests pass.

**Next decision:** Submission packaging and documentation.

---

## Milestone 10: Submission packaging

**Date:** 2026-07-29

**Problem:** The Build-Off submission required judge-facing documentation, a demo video script, architecture diagrams, and a clear separation between deployed features and roadmap items.

**Decision:** Begin creating `docs/submission/` with the narrative foundation:
- `BUILD_JOURNAL.md` — chronological milestone log
- `WHY_BASE44.md` — platform discovery story
- `BACKEND_CAPABILITY_LEDGER.md` — capability audit
- `AGENTIC_DEVELOPMENT_METHOD.md` — agentic workflow

Additional documents (DEV_BUILD_OFF_SUBMISSION.md, BASE44_ARCHITECTURE.md, JUDGE_GUIDE.md, PRIVACY_AND_SECURITY.md, ROADMAP.md, VIDEO_SCRIPT.md) are required/planned under Issues #39 and #40.

**Base44 capability used:** All Entities (13 schemas), Functions (12 deployed baseline + 1 merged not deployed), Auth/RLS, hosting, SDK.

**Issue / PR / SHA:** Issue #39; branch `docs/submission-base44-discovery-journal-42`.

**Failure or risk:** Documentation could claim deployed status for un-merged or undeployed features.

**Correction:** Every capability claim cross-references its exact merge SHA and deployment status. `MERGED_NOT_DEPLOYED` used for merged-but-undeployed features.

**Verification evidence:** All documents reference actual source paths and SHAs. No fabricated capabilities.

**Product result:** Submission narrative and capability-audit foundation prepared.

**Issue / PR / SHA:** Issue #39; branch `docs/submission-base44-discovery-journal-42`.

**Failure or risk:** Documentation could claim deployed status for un-merged or undeployed features.

**Correction:** Every capability claim cross-references its exact merge SHA and deployment status. `MERGED_NOT_DEPLOYED` used for merged-but-undeployed features.

**Verification evidence:** All documents reference actual source paths and SHAs. No fabricated capabilities.

**Product result:** Submission-ready documentation package.

**Next decision:** Realtime and Agent evaluation (roadmap).

---

## Milestone 11: Realtime / Agent evaluation

**Date:** 2026-07-29 (planned roadmap)

**Problem:** WatchTree currently polls entity state on privacy mutations. A realtime subscription would provide instant UI updates. However, Base44 realtime is listed as available but not yet production-tested in this codebase.

**Decision:** Document as `ROADMAP_ONLY` in the capability ledger. Not implemented in the submission build. The optional realtime enhancement is tracked in Issue #41 (realtime WatchTree refresh) and Issue #43 (Base44 Agent evaluation).

**Base44 capability used:** Base44 Realtime (not used), Base44 Agents (not used).

**Issue / PR / SHA:** Issue #41, #43.

**Failure or risk:** None — explicitly scoped out.

**Correction:** N/A.

**Verification evidence:** `BACKEND_CAPABILITY_LEDGER.md` lists both as `ROADMAP_ONLY`.

**Product result:** Clear separation between current capability and future enhancement.

**Next decision:** Final release disposition and submission.

---

## Appendix: Main branch evolution

```
61defea — accidental-file revert, post-noop discipline (Issue #20 baseline)
34fc099 — release CI enforcement merged (Issue #30, PR #32)
a497590 — privacy lifecycle complete (Issue #29, PR #36)
959afdc — API-key-free URL collection + archetype matching (Issue #33, PR #37)
```

| Metric | Value |
|--------|-------|
| Entity schemas (source) | 13 |
| Backend Functions (source) | 13 (12 deployed baseline + 1 merged not deployed) |
| Tests (final source) | 265 |
| CI jobs | 2 (test+browser, release) |
| External service deps | 0 |
