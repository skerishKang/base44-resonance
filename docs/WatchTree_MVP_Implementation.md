# WatchTree private viewing-path MVP

This source slice implements Issue #20 (original base `214cf519ea140fb97af87561782c2e98ea759ebd`) and is deployed to production. The preserved Memory Resonance branch is unchanged and remains available as secondary product evidence.

## Production status

- URL: https://base44-resonance-40117c91.base44.app
- App: `base44-resonance` (public App ID `6a6538c71a8e3e1640117c91`, a public identifier rather than a secret)
- Current release commit: `249332bbfe62f9c065c116f098165d87c46f6a9b` (`main`)
- Backend: 13 owner-scoped Entity schemas and 12 caller-scoped Functions under Base44 Auth and `created_by_id` RLS.

## Input and raw-file boundary

Supported files:

- `watch-history.json`
- `watch-history.html`
- `watch-history.htm`

The browser sends the selected `File` only to `src/watchtree/watch-history.worker.js`. The Worker enforces the 8 MiB, 5,000-record, JSON-depth, HTML-node, and eight-second budgets. It emits only bounded normalized event previews. Raw bytes are zeroed after parsing and are never sent to Base44, stored in Entities, localStorage, IndexedDB, logs, screenshots, or evidence.

HTML is processed by the locally bundled deterministic tokenizer in `parser-core.js`. It does not use `DOMParser`, insert into the live DOM, execute script, or resolve external resources.

## Durable flow

```text
local Worker parse
→ parse-watch-history bounded validation
→ explicit confirmation
→ commit-watch-import chunk receipts
→ build-watch-tree
→ matching opt-in
→ server-defined synthetic candidates
→ selected evidence consent
→ simulated mutual state
```

`commit-watch-import` uses a confirmation token, file digest, client nonce, chunk digest, source-record fingerprint, and `ImportChunkReceipt`. Identical retries replay safely; conflicting nonce or chunk payloads fail closed.

## Synthetic-only matching

The MVP compares the caller's eligible events only with the versioned `demo-corpus-v1` corpus. It does not scan another user's Entities and never invokes service role. Candidate evidence is causal and bounded:

- Exact overlap
- Rare signal
- Shared path
- Meaningful difference

The deterministic weights are `0.25 / 0.25 / 0.15 / 0.15 / 0.08 / 0.07 / 0.05`. No compatibility percentage or soulmate claim is rendered.

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
