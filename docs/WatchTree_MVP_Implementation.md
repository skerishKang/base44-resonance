# WatchTree private viewing-path MVP

This source slice implements Issue #20 (original base `214cf519ea140fb97af87561782c2e98ea759ebd`) and is deployed to production. The preserved Memory Resonance branch is unchanged and remains available as secondary product evidence.

## Production status

- URL: https://base44-resonance-40117c91.base44.app
- App: `base44-resonance` (public App ID `6a6538c71a8e3e1640117c91`, a public identifier rather than a secret)
- Reviewed production baseline before Issue #30: `249332bbfe62f9c065c116f098165d87c46f6a9b`
- Exact deployed commit: recorded in the corresponding production disposition
- Backend: 13 owner-scoped Entity schemas and 13 caller-scoped Functions under Base44 Auth and `created_by_id` RLS.

## Input and raw-file boundary

Supported inputs:

- YouTube URL (primary, no API key required)
- `watch-history.json` (advanced batch)
- `watch-history.html` (advanced batch)
- `watch-history.htm` (advanced batch)

YouTube URL collection works without a platform API key, user API key, or external metadata request. The URL is parsed and canonicalized on the backend. User-entered title and creator labels are stored with `metadata_provenance: user_provided`; empty labels are marked `none`. No channel, duration, category, or published-date enrichment is available in the submission build.

An optional future enhancement (Issue #38) may allow users to supply their own Google Cloud YouTube Data API key for verified metadata enrichment. In that mode, the user's own key, project, and quota apply; the key is never committed to the repository; and only public metadata lookup is performed (no OAuth, no watch-history access).

The browser sends the selected `File` only to `src/watchtree/watch-history.worker.js`. The Worker enforces the 8 MiB, 5,000-record, JSON-depth, HTML-node, and eight-second budgets. It emits only bounded normalized event previews. Raw bytes are zeroed after parsing and are never sent to Base44, stored in Entities, localStorage, IndexedDB, logs, screenshots, or evidence.

HTML is processed by the locally bundled deterministic tokenizer in `parser-core.js`. It does not use `DOMParser`, insert into the live DOM, execute script, or resolve external resources.

## Durable flow

```text
YouTube URL (paste, parse, optional label, confirm)
or
local Worker parse (Takeout JSON/HTML)
→ parse-watch-history bounded validation (or add-watch-url-event)
→ explicit confirmation with chunk receipts / nonce idempotency
→ commit-watch-import / add-watch-url-event
→ build-watch-tree
→ matching opt-in
→ server-defined synthetic candidates
→ selected evidence consent
→ simulated mutual state
```

`commit-watch-import` uses a confirmation token, file digest, client nonce, chunk digest, source-record fingerprint, and `ImportChunkReceipt`. Identical retries replay safely; conflicting nonce or chunk payloads fail closed.

`add-watch-url-event` uses nonce-based per-event idempotency: same nonce + same payload → same event; same nonce + different payload → `NONCE_CONFLICT`. Explicit `rewatch=true` creates a new event per new nonce.

## Synthetic-only matching

The MVP compares the caller's eligible events only with the versioned `demo-corpus-v1` corpus of **11 synthetic viewing profiles** (3 competition demo + 8 archetypes). It does not scan another user's Entities and never invokes service role. Candidate evidence is causal and bounded:

- Exact overlap
- Rare signal
- Shared path
- Meaningful difference
- Shared creator
- Repeated together

The deterministic weights are `0.25 / 0.25 / 0.15 / 0.15 / 0.08 / 0.07 / 0.05`. No compatibility percentage or soulmate claim is rendered.

Matching requires at least `MIN_EVENTS_FOR_MATCHING = 4` eligible events. 0–3 events return an empty candidate list (`insufficient_signal`). 4+ events with sufficient signal produce up to 3 candidates.

In the no-key submission build, only signals actually available in stored records are used:
- Exact video repetition
- Repeat ratio
- Watched-time rhythm
- Sequence concentration
- Collection size and diversity
- Optional user-provided title/creator labels

Duration, category, channel-ID, and published-date evidence are never manufactured when those fields are absent.

## Privacy defaults

- owner-only
- matching off
- reveal off
- no automatic sensitivity classifier

Users can exclude an event, creator, or date range; disable import matching; withdraw consent; delete one import and its derivatives; or delete all WatchTree data.

## Test harness

The production entry graph uses only `createProductionWatchTreeAdapter`. The in-memory adapter is imported only by `tests/harness/harness.jsx`, has no production query-parameter path, and reuses the real React experience, reducer, parser Worker, matching functions, and privacy state transitions.

CI is credential-free and performs:

```text
npm ci
npm run sync:base44-shared
npm run check:base44-shared
npm run test:ci
npm run build
npm run test:browser
npm run build:release        # with the public production App ID; fails closed without it
npm run check:release-bundle # asserts production App ID present; forbidden IDs, localhost, jsxDEV absent
```

CI never deploys, pushes Base44 resources, mutates secrets, or makes hosted calls. Deployment is a separate owner-controlled step. No Base44 auth push, resource push, hosted call, OTP, password, cookie, or token is required for CI.

## Visual provenance

The runtime subset under `public/watchtree` is copied from the accepted package:

`WatchTree_Visual_Preproduction_Handoff_Corrected_2026-07-27.zip`

SHA-256:

`987cf85dcf117f671d159344a1a687947c6c27b1878afb89ec0656067376510c`

All included SVGs are original, local, platform-neutral assets. Google Drive is not a runtime dependency.
