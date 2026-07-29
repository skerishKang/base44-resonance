# Build Journal — Resonance / WatchTree

A public chronological record of the product decisions, failures, corrections, and verification evidence behind **WatchTree by Resonance**.

This journal separates four states deliberately:

- `VERIFIED_PRODUCTION` — deployed and runtime-verified.
- `MERGED_NOT_DEPLOYED` — merged to `main`, but not yet verified in Production.
- `ROADMAP_ONLY` — researched or planned, not implemented.
- `NOT_USED` — intentionally excluded from the competition build.

---

## Milestone 1 — Initial Resonance concept and backend proof

**Date:** 2026-07-26

**Problem:** The original Memory Resonance concept combined private memories, AI fingerprinting, relationship discovery, realtime conversation, and a broad multi-screen product. It was too large for a short Build-Off cycle.

**Decision:** Use Base44 Entity schemas, `created_by_id` RLS, and caller-scoped Deno Functions to prove the backend model, then evaluate a narrower product.

**Correction evidence:** An accidental no-op write reached `main`, was immediately reverted with zero tree change, and led to a strict PR-only integration rule.

**Outcome:** The team retained the backend proof but reduced the product surface.

---

## Milestone 2 — Pivot to WatchTree

**Date:** 2026-07-26

**Problem:** Memory Resonance required runtime AI, real relationship semantics, and a complex conversation model before its trust boundaries were ready.

**Decision:** Replace it as the primary product with **WatchTree**, a privacy-first viewing-memory experience. WatchTree builds a private tree from records a person deliberately contributes and compares it only with a versioned corpus of synthetic viewing archetypes. Matching is deterministic; no real-user scan, compatibility percentage, or runtime AI is used.

**Outcome:** WatchTree became the competition product. The earlier Memory Resonance resources remain secondary, deployment-compatible evidence rather than the primary journey.

### Why YouTube was selected first

WatchTree was designed around viewing behavior, not permanent dependence on one platform.

TikTok, Instagram, Facebook, and other video services may also contain meaningful preference and memory signals. During this Build-Off, however, their user-history export formats, API permissions, retention rules, metadata reliability, and practical privacy boundaries were not sufficiently validated for a production claim.

YouTube offered the clearest bounded starting point. A person can deliberately choose a public video link, optionally add a watched date or private note, and build repeat, sequence, creator, and time-rhythm signals only from records they intentionally contribute. That path demonstrates the product without automatically reading a social account or depending on unrestricted platform access.

The competition build does **not** assume that YouTube or another platform API exposes a complete watch history or authoritative repeat-view count. Repeat and revisit signals are derived only from deliberately added records or from an explicitly authorized and validated import source.

The architecture remains platform-extensible. A future video source can be added through a bounded adapter only after its URL formats, metadata provenance, user-authorized history access, export availability, privacy terms, retention behavior, and deletion semantics are separately researched and verified.

**Current platform position:** `YouTube-first, not YouTube-only`.

---

## Milestone 3 — Owner-scoped Entity model

**Date:** 2026-07-26

**Decision:** Define 13 Entity schemas with Base44 declarative RLS. Create is limited to authenticated `user` and `admin` roles; read, update, and delete are restricted by `created_by_id`.

Core WatchTree Entities:

- `WatchImport`
- `WatchEvent`
- `WatchTreeFingerprint`
- `SharedPathCandidate`
- `RevealConsent`
- `MutualResonance`
- `WatchMatchSignal`
- `ImportChunkReceipt`

Five earlier Resonance Entities remain deployment-compatible but are not presented as core WatchTree functionality.

**Outcome:** The browser never needs a service-role path or client-controlled owner field.

---

## Milestone 4 — Caller-scoped Deno Function architecture

**Date:** 2026-07-26–28

**Problem:** Early function drafts used an invalid entrypoint assumption and needed a consistent request, identity, and error contract.

**Decision:** Standardize all 13 Function sources on:

```text
Deno.serve
→ createClientFromRequest(req)
→ base44.auth.me()
→ bounded POST/JSON validation
→ deterministic caller-scoped logic
→ sanitized success or failure response
```

Canonical shared modules are synchronized into Function directories and checked for SHA-256 parity in CI.

**Correction:** Functions were rewritten from the invalid `context.base44` assumption to the Base44 request-scoped SDK pattern.

**Outcome:** 13 auditable Function sources; 12 were present in the earlier Production baseline and `add-watch-url-event` remains pending final Production deployment.

---

## Milestone 5 — Synthetic-only deterministic matching

**Date:** 2026-07-26–28

**Decision:** Compare only the caller’s eligible events with a server-defined synthetic corpus. Signals include exact overlap, rarity-weighted overlap, repeat/revisit behavior, sequential path similarity, creator adjacency, temporal rhythm, and meaningful difference.

**Failures found in review:**

- A threshold intended for larger imports blocked small deliberate URL collections.
- Empty creator labels were incorrectly treated as meaningful creator buckets.
- Duration or category claims could appear without verified metadata.

**Corrections:**

- URL collections use a lower, explicit minimum signal threshold.
- Empty creator values are excluded.
- Duration/category-dependent archetypes require verified supporting data.
- API-key-free collections use a grounded archetype subset.

**Outcome:** Explainable synthetic matches without fabricated metadata or real-person implication.

---

## Milestone 6 — Consent and simulated mutual state

**Date:** 2026-07-27

**Decision:** The user selects evidence tokens, grants explicit reveal consent, and may then trigger a `MutualResonance` record marked as simulated.

**Correction:** Consent and mutual state are invalidated after privacy mutations to prevent stale disclosure state.

**Outcome:** No evidence is revealed by default, and no real person is contacted.

---

## Milestone 7 — Privacy lifecycle and bounded deletion

**Date:** 2026-07-28

**Problem:** A capped single-pass cascade could leave large collections partially deleted, and broad restoration queries could revive stale consent or mutual records.

**Decision:** Implement budget-threaded, resumable, child-first deletion with orphan reconciliation and final empty verification. Restoration is scoped to the active import, candidate, granted consent, and corresponding mutual state.

**Correction evidence:** Tests cover thousands of records, interrupted deletion, budget exhaustion, resume behavior, cross-user-unavailable semantics, and empty verification.

**Outcome:** Deletion is a first-class product operation rather than a footer promise.

---

## Milestone 8 — Production-capable CI

**Date:** 2026-07-28

**Decision:** Maintain two credential-free jobs:

1. `test-build-browser` — shared-source parity, deterministic tests, Vite build, browser validation.
2. `release-build` — fail-closed App-ID validation, Production bundle, bundle-content assertions.

CI never deploys, changes secrets, calls live AI, or requires a Base44 token.

**Outcome:** Source validation and Production deployment are separate evidence gates.

---

## Milestone 9 — API-key-free deliberate URL collection

**Date:** 2026-07-28

**Problem:** A YouTube Data API dependency would introduce a secret, an external availability dependency, and unsupported metadata expectations.

**Decision:** Remove the metadata-fetching Function and all API-key requirements. `add-watch-url-event` performs bounded URL validation and stores only deliberate additions plus explicitly user-provided labels marked with provenance.

**Truth boundary:**

- No OAuth.
- No automatic account-history access.
- No YouTube API key in the competition build.
- No claim that user-entered labels are verified metadata.

**Status:** Source merged in `959afdcc85e352665e58efc6394a0db91809ab5d`; final Production deployment pending.

---

## Milestone 10 — Public submission documentation

**Date:** 2026-07-29

**Decision:** Treat the repository itself as part of the submission. Public documents must distinguish source, deployed runtime, roadmap, and intentionally unused capabilities.

Core public documents:

- `README.md`
- `BUILD_JOURNAL.md`
- `WHY_BASE44.md`
- `BACKEND_CAPABILITY_LEDGER.md`
- `AGENTIC_DEVELOPMENT_METHOD.md`

Video-production documents are maintained separately and remain provisional until the exact Production release is recorded and captured.

---

## Milestone 11 — Owner-scoped Realtime source

**Date:** 2026-07-29

**Decision:** Add caller-owned `WatchEvent` subscription, 200 ms debounced restore, session identity isolation, late-subscription cleanup, and stale-callback protection.

**Evidence:** PR #45, squash merge `7a16adbd977ff5f2df2ceb2acc4130d242606dec`; 12 focused lifecycle scenarios.

**Status:** `MERGED_NOT_DEPLOYED`. It becomes submission-eligible only after exact Production deployment and authenticated two-tab UAT.

---

## Milestone 12 — Next-only judge tutorial

**Date:** 2026-07-29

**Problem:** The full authenticated page exposed too much functionality at once for a first-time judge.

**Decision:** Add a bounded six-step Mina story that reuses the actual adapter paths for synthetic seed, tree construction, synthetic matching, evidence, consent, simulated mutual state, replay, and deletion.

**Review corrections:**

- Fixed the initial inactive render and exact step-transition contract.
- Prevented duplicate mutations after Back and Replay.
- Corrected delete-loop completion and restored-empty verification.
- Added unmount/session safety.
- Completed English/Korean visible-copy and accessibility parity.
- Added mounted browser paths for desktop, mobile, reduced motion, and Korean UI.

**Evidence:** PR #47, reviewed head `5a00fe876f2bb54c254bed1286005c5366359e2f`, squash merge `4efc2827bf9fae2ad99602090c2621845b7c89a3`; 314/314 deterministic tests and 11 browser scenarios at the reviewed head.

**Status:** `MERGED_NOT_DEPLOYED`. Issue #35 remains open for the broader route-based information architecture beyond this minimum judge slice.

---

## Current source and release ledger

| Item | Current state |
| --- | --- |
| Latest reviewed `main` | `4efc2827bf9fae2ad99602090c2621845b7c89a3` |
| Entity schemas in source | 13 |
| Function sources | 13 |
| Earlier Production Function baseline | 12 |
| Deterministic tests | 314 |
| Browser scenarios | 11 |
| Realtime | `MERGED_NOT_DEPLOYED` |
| Judge tutorial | `MERGED_NOT_DEPLOYED` |
| AI / LLM / Agent | `NOT_USED` in competition build; Agent evaluation remains roadmap-only |
| File storage | `NOT_USED` |
| External video-platform adapters | `ROADMAP_ONLY`, subject to platform-specific research |

## Main branch evolution

```text
61defea — accidental no-op revert and PR-only discipline
34fc099 — release CI enforcement
1de65e5 — Resonance and WatchTree product baseline
c592a29 — reveal-consent token-scope correction
a497590 — privacy lifecycle hardening
959afdc — API-key-free URL collection and grounded archetypes
7a16adb — owner-scoped Realtime source
c681194 — Base44 discovery and build-journal documentation
4efc282 — next-only judge tutorial with EN/KO parity
```

## Remaining release work

1. Deploy the exact reviewed release to the Base44 Production app.
2. Verify the deployed Entity and Function inventory.
3. Run authenticated UAT, including owner isolation, URL collection, tutorial, Realtime two-tab behavior, consent, restoration, and delete-all.
4. Record the exact deployed SHA and timestamp.
5. Capture and render the final demo video from the verified release.
6. Upload and verify the public submission links.
