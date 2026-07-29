# Backend Capability Ledger — Resonance / WatchTree

This public ledger distinguishes implemented source, deployed runtime, roadmap, and intentionally unused Base44 capabilities.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `VERIFIED_PRODUCTION` | Deployed and verified against the public Base44 app |
| `MERGED_NOT_DEPLOYED` | Merged to `main`; exact Production deployment or UAT still pending |
| `ROADMAP_ONLY` | Planned or researched; not implemented in the competition build |
| `NOT_USED` | Intentionally excluded |

## Release snapshot

| Item | State |
| --- | --- |
| Public Base44 app | https://base44-resonance-40117c91.base44.app |
| Public App ID | `6a6538c71a8e3e1640117c91` |
| Latest reviewed `main` | `4efc2827bf9fae2ad99602090c2621845b7c89a3` |
| Current Production | Older reviewed baseline; final source deployment pending |
| Entity schemas in source | 13 |
| Function sources | 13 |
| Earlier Production Function baseline | 12 |
| Deterministic tests | 314 |
| Browser scenarios | 11 |

A source capability is not treated as Production-active until the exact release is deployed and its runtime evidence is recorded.

---

## Authentication and caller identity

| Field | Value |
| --- | --- |
| **Status** | `VERIFIED_PRODUCTION` capability; final release reconfirmation pending |
| **Implementation** | Base44 Auth establishes the caller. Function entrypoints use `createClientFromRequest(req)` and `base44.auth.me()` through shared authentication guards. |
| **Owner boundary** | No custom password store, browser service-role client, or caller-controlled owner field. |
| **Source proof** | `src/lib/AuthPanel.jsx`, `base44/functions/*/entry.ts` |
| **Judge-visible proof** | The public app requires authentication before entering private WatchTree state. |
| **Submission eligibility** | Yes after final release reconfirmation |

---

## Database and Entity RLS

| Field | Value |
| --- | --- |
| **Status** | `VERIFIED_PRODUCTION` capability; latest additive source fields are `MERGED_NOT_DEPLOYED` |
| **Implementation** | 13 JSONC Entity schemas. Create is allowed for authenticated `user` and `admin` roles; read, update, and delete are owner-scoped through `created_by_id`. |
| **Source proof** | `base44/entities/*.jsonc` |
| **Restrictions** | No private Entity uses `read: true`, public mutation, cross-user scan, browser service role, or client-supplied ownership. |
| **Submission eligibility** | Yes after exact final schema deployment verification |

### Entity inventory

| Entity | Product role | Current use |
| --- | --- | --- |
| `WatchImport` | Import or deliberate collection session | Core |
| `WatchEvent` | One normalized viewing occurrence | Core |
| `WatchTreeFingerprint` | Private computed tree | Core |
| `SharedPathCandidate` | Synthetic matching result | Core |
| `RevealConsent` | Selected-evidence consent | Core |
| `MutualResonance` | Explicitly simulated mutual state | Core |
| `WatchMatchSignal` | Deterministic matching digest | Core |
| `ImportChunkReceipt` | Idempotent import progress | Core |
| `CapabilityProbe` | Earlier backend proof | Retained |
| `ConsentRecord` | Earlier Resonance consent model | Retained |
| `MatchDecision` | Earlier simulated decision model | Retained |
| `MemoryCard` | Earlier Memory Resonance input | Retained |
| `ResonanceFingerprint` | Earlier fingerprint model | Retained |

Retained Entities are not presented as required WatchTree functionality and are not removed from a live data model without a migration decision.

---

## Caller-scoped Deno Functions

| Field | Value |
| --- | --- |
| **Status** | 12-Function baseline `VERIFIED_PRODUCTION`; `add-watch-url-event` and final source set are `MERGED_NOT_DEPLOYED` |
| **Implementation** | 13 `Deno.serve` entrypoints using request-scoped Base44 SDK clients, caller authentication, bounded POST/JSON validation, nonce or idempotency guards, deterministic logic, and sanitized responses. |
| **Shared-source proof** | Canonical modules under `base44/functions/_shared/` are synchronized and checked for parity in CI. |
| **Source proof** | `base44/functions/*/entry.ts` |
| **Submission eligibility** | Yes after all 13 exact release Functions are deployed and inventoried |

### Function inventory

| Function | Responsibility | Product status |
| --- | --- | --- |
| `add-watch-url-event` | Deliberate URL collection commit | Core; source merged, deployment pending |
| `build-watch-tree` | Private tree computation | Core |
| `commit-watch-import` | Bounded import commit | Core |
| `delete-watch-data` | Privacy mutations and bounded deletion | Core |
| `find-shared-paths` | Deterministic synthetic scoring | Core |
| `parse-watch-history` | Bounded import preview contract | Core |
| `reconcile-watch-data` | Orphan and consistency repair | Core |
| `seed-demo-history` | Clearly synthetic demo data | Core |
| `set-reveal-consent` | Evidence consent persistence | Core |
| `simulate-mutual` | Explicitly simulated mutual state | Core |
| `compute-matches` | Earlier matching path | Retained |
| `generate-fingerprint` | Earlier Resonance fingerprint path | Retained |
| `verify-capability` | Earlier backend proof | Retained |

No Function uses service role, live AI inference, a Base44 Agent, raw authentication material, or a cross-user matching scan.

---

## Realtime subscriptions

| Field | Value |
| --- | --- |
| **Status** | `MERGED_NOT_DEPLOYED` |
| **Implementation** | Caller-owned `WatchEvent` subscription, 200 ms debounced restore, per-session identity isolation, late-subscription cleanup, unsubscribe lifecycle, stale-callback guard, and non-mutating callbacks. |
| **Merged evidence** | PR #45, squash merge `7a16adbd977ff5f2df2ceb2acc4130d242606dec` |
| **Source proof** | `src/watchtree/realtime/createWatchTreeRealtime.js`, `src/watchtree/productionAdapter.js`, `tests/watchtree-realtime.test.mjs` |
| **Production requirement** | Exact deployment plus authenticated two-tab owner-scoped UAT |
| **Submission eligibility** | No until Production verification is complete |

---

## Guided judge tutorial

| Field | Value |
| --- | --- |
| **Status** | `MERGED_NOT_DEPLOYED` |
| **Implementation** | Six-step Mina story reusing actual adapters for synthetic seed, tree construction, synthetic matching, evidence, consent, simulated mutual state, replay, and deletion. |
| **Truth boundary** | Mina and all candidates are synthetic; no real user is contacted; no automatic YouTube-account access; no runtime AI. |
| **Merged evidence** | PR #47, squash merge `4efc2827bf9fae2ad99602090c2621845b7c89a3` |
| **Validation** | 314 deterministic tests; 11 browser scenarios including desktop, mobile, reduced motion, and Korean UI |
| **Production requirement** | Exact release deployment and authenticated tutorial UAT |

The broader route-based information architecture remains open separately; the competition slice is intentionally bounded.

---

## AI, LLM, and Base44 Agent

| Field | Value |
| --- | --- |
| **Status** | `NOT_USED` in the competition build; Agent evaluation is `ROADMAP_ONLY` |
| **Implementation** | Matching uses deterministic versioned scoring. No LLM prompt, runtime inference, AI SDK import, or Base44 Agent is required. |
| **Source proof** | `src/watchtree/matching.js`, `base44/functions/_shared/watchtree-archetypes.js` |
| **Submission eligibility** | No |
| **Reason** | Reproducibility, explainability, bounded latency, and a truthful synthetic-only product boundary |

External coding agents helped implement source, but that is a development method—not a runtime AI capability of the product.

---

## File and media storage

| Field | Value |
| --- | --- |
| **Status** | `NOT_USED` |
| **Implementation** | Raw HTML/JSON viewing-history files are parsed inside a browser Worker and are not uploaded as files. Deliberate URL collection does not require file storage. |
| **Source proof** | `src/watchtree/watch-history.worker.js`; no upload Function exists |
| **Submission eligibility** | No |
| **Privacy result** | The server receives bounded normalized records rather than a raw history file. |

---

## Video-platform source boundary

| Field | Value |
| --- | --- |
| **Current source** | YouTube-first deliberate URL input plus an explicitly authorized import path |
| **Automatic account-history access** | Not implemented |
| **YouTube API / OAuth** | Not used in the competition build |
| **TikTok / Instagram / Facebook** | `ROADMAP_ONLY`; feasibility research incomplete |
| **Expansion rule** | Add a bounded adapter only after URL, metadata provenance, user-authorized access, export, retention, privacy, and deletion behavior are verified |

The architecture is platform-extensible, but unsupported platforms are not listed as implemented integrations.

---

## Capability summary

| Capability | Status now | Final verification required |
| --- | --- | --- |
| Base44 Auth | `VERIFIED_PRODUCTION` capability | Final release sign-in and caller-identity UAT |
| Entities / RLS | Baseline `VERIFIED_PRODUCTION`; latest source delta pending | Exact 13-schema deployment inventory and owner-isolation UAT |
| Deno Functions | 12 baseline verified; 13-source release pending | Exact Function deployment inventory and runtime contract UAT |
| Realtime | `MERGED_NOT_DEPLOYED` | Authenticated two-tab UAT |
| Judge tutorial | `MERGED_NOT_DEPLOYED` | Authenticated end-to-end tutorial and deletion UAT |
| AI / LLM / Agent | `NOT_USED` | None; do not select the submission capability |
| File storage | `NOT_USED` | None; do not select the submission capability |
| Additional video platforms | `ROADMAP_ONLY` | Platform-specific feasibility and privacy research |
