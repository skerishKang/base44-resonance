# Resonance — WatchTree

Resonance / 공명 is a bilingual Base44 Build-Off product. The primary product is **WatchTree**: a private viewing-path experience that turns your own watch history into explainable, synthetic-only resonance candidates — without exposing raw history and without scanning other users.

This repository belongs only to **Business 56 · Resonance / 공명**. It is not Business 25, Love Matchmaking, or an AI Revenue Lab registry application.

## Production

| Field | Value |
| --- | --- |
| Production URL | https://base44-resonance-40117c91.base44.app |
| Production app | `base44-resonance` |
| Public App ID | `6a6538c71a8e3e1640117c91` |
| Reviewed production baseline before Issue #30 | `249332bbfe62f9c065c116f098165d87c46f6a9b` |
| Exact deployed commit | recorded in the corresponding production disposition |
| Status | Deployed and live |

The App ID is a public application identifier, not a credential or secret.

## 90-second judge path

1. Open the production URL.
2. Sign in or create a verified Base44 account.
3. Enter WatchTree and choose to start with synthetic data — no real watch history is required.
4. Opt in to matching and review three clearly labeled synthetic candidates with bounded causal evidence.
5. Select the evidence you are willing to reveal, record explicit reveal consent, and inspect the revealed shared path.
6. Run the explicitly labeled **simulated** mutual-resonance state.

All candidates are server-defined synthetic profiles. The mutual state is a simulation. No real person is contacted, notified, or matched.

## WatchTree product journey

```text
local Worker parse (raw bytes never leave the browser)
→ parse-watch-history bounded validation
→ explicit confirmation with chunk receipts
→ build-watch-tree
→ matching opt-in
→ three server-defined synthetic candidates
→ selected-evidence reveal consent
→ explicitly simulated mutual state
```

Raw viewing history is parsed only inside a browser Worker, is never sent to Base44 or stored in Entities, and candidate evidence stays causal and bounded: exact overlap, rare signal, shared path, and meaningful difference. No compatibility percentage or soulmate claim is rendered.

## Durable Base44 resources

Base44 Auth establishes caller identity. All **13 Entity schemas** are owner-scoped through Base44’s built-in `created_by_id` metadata (RLS): create is allowed for authenticated `user` and `admin` roles, while read, update, and delete are owner-only. No private Entity uses `read: true`, public mutation, client-controlled owner fields, or a browser service-role path.

Entity schemas (13):

`CapabilityProbe` · `ConsentRecord` · `ImportChunkReceipt` · `MatchDecision` · `MemoryCard` · `MutualResonance` · `ResonanceFingerprint` · `RevealConsent` · `SharedPathCandidate` · `WatchEvent` · `WatchImport` · `WatchMatchSignal` · `WatchTreeFingerprint`

Caller-scoped Functions (12):

`build-watch-tree` · `commit-watch-import` · `compute-matches` · `delete-watch-data` · `find-shared-paths` · `generate-fingerprint` · `parse-watch-history` · `reconcile-watch-data` · `seed-demo-history` · `set-reveal-consent` · `simulate-mutual` · `verify-capability`

No Function uses service role, live AI, Agents, Integrations, or raw authentication material. Secret values — the protected `WATCHTREE_HMAC_KEY` used for internal HMAC digests — are never exposed to the browser, repository, logs, or response payloads. Inaccessible and nonexistent resource IDs share the same unavailable error class.

## Synthetic-only boundary

Matching compares the caller’s own eligible events only against the versioned `demo-corpus-v1` corpus. It never scans another user’s Entities and never invokes service role. Reveal consent applies only to the caller’s own selected evidence tokens, and mutual resonance is an explicit simulation.

## Retained Memory Resonance foundation

The earlier Memory Resonance Slice 2 journey — private Memory Cards → explicit ConsentRecord → deterministic ResonanceFingerprint → three synthetic candidates → one simulated MatchDecision — remains available as secondary product evidence, together with the original `CapabilityProbe` backend proof. WatchTree is the primary product narrative.

## Local commands

```bash
npm ci
npm run test:ci
npm run build                 # deterministic dev/CI build; no App ID required
npm run build:release         # production release build; fails closed without VITE_BASE44_APP_ID
npm run check:release-bundle  # asserts production App ID present; forbidden IDs, localhost, jsxDEV absent
npm run test:browser
npm run dev
```

Tests are deterministic and credential-free. They do not deploy, push Base44 resources, call live AI, or require a Base44 token.

## CI and release contract

- CI runs on pull requests and on pushes to `main`, plus the two historical feature branches.
- Pull-request CI stays deterministic and credential-free: shared-function parity, tests, a plain build, and browser validation. It never deploys.
- The release job first proves fail-closed behavior: `npm run build:release` without `VITE_BASE44_APP_ID` must fail.
- The release bundle is then built with the public production App ID supplied through non-secret CI configuration and is asserted to contain that ID and to exclude the validation and buildoff App IDs, `localhost:4400`, and `jsxDEV`.
- CI never deploys, pushes Base44 resources, mutates secrets, calls live AI, or requires a Base44 token.

## Runtime validation boundary

Deployment and browser runtime claims are separate validation steps performed against the existing production app after Web CTO review: Auth, owner RLS, Function contracts, cross-user isolation, mobile/desktop evidence, retries, reload restoration, duplicate-mutation behavior, and the reveal-consent hotfix path.
