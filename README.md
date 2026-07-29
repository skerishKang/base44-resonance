# WatchTree by Resonance

> **🔴 Live app:** [base44-resonance-40117c91.base44.app](https://base44-resonance-40117c91.base44.app) — no login required to see the landing page.
>
> Sign in via email/password (Google login is also configured in source; production button visibility pending deployment verification).

---

## Quick start

### A. Current production entry

1. Open the **live app** → see the WatchTree landing page (English, mobile-responsive).
2. Click **Enter WatchTree** → sign in via email/password.
3. Choose **Build my WatchTree** — you can start with synthetic demo data or import a viewing-history file.
4. Inspect the synthetic matches, consent to evidence reveal, and run the simulated mutual state.
5. Delete all data — deletion is bounded, resumable, and verifiable.

> ⚠️ The six-step guided tutorial, Realtime owner-scoped refresh, and deliberate YouTube URL addition are **merged in source but not yet deployed** to Production. They are not available in the current production build.

### B. Judge path after final release

The full path below requires exact Production deployment and authenticated UAT. Until then the tutorial and Realtime remain source-only capabilities.

1. Sign in or create a verified account.
2. Choose **See Mina's WatchTree story** for the six-step synthetic tutorial, or start with your own deliberately added video link.
3. Build the private WatchTree.
4. Inspect clearly labeled synthetic matches and their evidence.
5. Select what evidence may be revealed and grant explicit consent.
6. Run the clearly labeled simulated mutual state.
7. Replay, return to the real product path, or delete the tutorial data.
8. Verify Realtime two-tab owner-scoped refresh.

The tutorial persona and every candidate are synthetic. No real person is contacted, notified, or matched.

---

**WatchTree** is a privacy-first viewing-memory product built on Base44. It turns the video links or viewing records a person deliberately contributes into a private behavioral tree, then compares that tree only with clearly synthetic viewing archetypes using deterministic, explainable signals.

It does **not** automatically read a YouTube account, scan other users, perform real-person matching, or use runtime AI for matching. Every mutual state in the competition build is explicitly simulated.

## Project status

| Surface | Status |
| --- | --- |
| Public Base44 app | Live at [base44-resonance-40117c91.base44.app](https://base44-resonance-40117c91.base44.app) |
| Public App ID | `6a6538c71a8e3e1640117c91` |
| Latest reviewed source on `main` | `4efc2827bf9fae2ad99602090c2621845b7c89a3` |
| Current production deployment | Older reviewed baseline; final source deployment and authenticated UAT are still pending |
| Entity schemas in source | 13 |
| Deno Function sources | 13 |
| Production Function baseline | 12 |
| Deterministic tests at latest reviewed source | 314 |
| Realtime | Source merged; Production verification pending |
| Guided judge tutorial | Source merged; Production verification pending |
| AI / LLM / Base44 Agent | Not used in the competition build |
| Base44 File storage | Not used |

The public app may temporarily lag the latest source. A source feature is not described as deployed until the exact Production release and UAT evidence are recorded.

## What WatchTree does

```text
Deliberately added YouTube URL
or browser-local viewing-history import
→ owner-private WatchEvent records
→ deterministic WatchTree construction
→ matching opt-in
→ synthetic archetype candidates
→ inspectable evidence
→ explicit reveal consent
→ explicitly simulated mutual state
→ privacy controls and bounded deletion
```

Raw imported history is parsed in a browser Worker and is not uploaded as a raw file. URL collection stores only a validated deliberate addition and bounded user-provided fields. Candidate evidence remains causal and inspectable; the product does not render a compatibility percentage or “soulmate” claim.

## Judge path after final release

See the condensed path in [Quick Start B](#b-judge-path-after-final-release) above. This section provides the full detail.

1. Open the Base44 app and sign in or create a verified account.
2. Choose **See Mina's WatchTree story** for the six-step synthetic tutorial, or start with your own deliberately added video link.
3. Build the private WatchTree.
4. Inspect clearly labeled synthetic matches and their evidence.
5. Select what evidence may be revealed and grant explicit consent.
6. Run the clearly labeled simulated mutual state.
7. Replay, return to the real product path, or delete the tutorial data.
8. Verify Realtime two-tab owner-scoped refresh (requires final Production deployment).

The tutorial persona and every candidate are synthetic. No real person is contacted, notified, or matched.

## Why YouTube was selected first

WatchTree is **YouTube-first, not YouTube-only**.

TikTok, Instagram, Facebook, and other video platforms may also contain meaningful viewing signals. During this Build-Off, however, their user-history exports, API permissions, retention behavior, metadata reliability, and practical privacy boundaries were not sufficiently validated for a truthful production claim.

YouTube offered the clearest bounded starting point: a person can deliberately choose a public video link, optionally add a watched date or private note, and create repeat, sequence, creator, and time-rhythm signals only from records they intentionally contribute. The current build does not assume that any platform API exposes a complete watch history or authoritative repeat-view count.

The source architecture is platform-extensible. Another platform can be added through a bounded source adapter after its URL formats, metadata provenance, user-authorized history access, export availability, privacy terms, and deletion behavior are separately researched and verified.

## Base44 architecture

Base44 is the production backend and runtime authority:

- **Auth** establishes caller identity.
- **13 Entity schemas** use owner-scoped `created_by_id` RLS.
- **13 Deno Function sources** use caller-scoped Base44 SDK clients and bounded request contracts.
- **Realtime source** subscribes to caller-owned `WatchEvent` resources and restores state with session isolation; Production UAT remains pending.
- **Hosting and deployment** are provided by Base44.

The project does not use service-role access, cross-user Entity scans, runtime AI matching, or a separate database/Auth/API stack. The backend-only `WATCHTREE_HMAC_KEY` is referenced by name for architecture documentation; its value is never stored in the repository, browser bundle, logs, or response payloads.

## Source inventory

Entity schemas:

`CapabilityProbe` · `ConsentRecord` · `ImportChunkReceipt` · `MatchDecision` · `MemoryCard` · `MutualResonance` · `ResonanceFingerprint` · `RevealConsent` · `SharedPathCandidate` · `WatchEvent` · `WatchImport` · `WatchMatchSignal` · `WatchTreeFingerprint`

Caller-scoped Function sources:

`add-watch-url-event` · `build-watch-tree` · `commit-watch-import` · `compute-matches` · `delete-watch-data` · `find-shared-paths` · `generate-fingerprint` · `parse-watch-history` · `reconcile-watch-data` · `seed-demo-history` · `set-reveal-consent` · `simulate-mutual` · `verify-capability`

## Development model

The product was not generated by one model in one prompt.

```text
Human project owner
→ product intent, consequential approval, deployment/submission authority

AI CTO
→ execution contracts, exact-head review, evidence verification, merge readiness

Coding agents and agentic IDEs
→ isolated source implementation

GitHub and CI
→ version-control, review, and evidence boundary

Base44
→ Auth, Entities/RLS, Deno Functions, runtime, hosting, deployment
```

CI does not deploy. Production release requires separate exact-release review, explicit owner approval, deployment, and authenticated UAT.

## Local validation

```bash
npm ci
npm run sync:base44-shared
npm run check:base44-shared
npm run test:ci
npm run build
VITE_BASE44_APP_ID=6a6538c71a8e3e1640117c91 \
VITE_BASE44_APP_SOURCE=production-release \
npm run build:release
npm run check:release-bundle
npm run test:browser
```

The deterministic CI path is credential-free. It does not deploy, mutate Base44 resources or secrets, call live AI, or require a Base44 token.

## Public documentation

- [Build Journal](docs/submission/BUILD_JOURNAL.md)
- [Why Base44](docs/submission/WHY_BASE44.md)
- [Backend Capability Ledger](docs/submission/BACKEND_CAPABILITY_LEDGER.md)
- [Agentic Development Method](docs/submission/AGENTIC_DEVELOPMENT_METHOD.md)

Video-production documents are prepared separately and remain provisional until the exact final Production release is captured, rendered, uploaded, and verified.