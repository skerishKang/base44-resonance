# Resonance

Resonance / 공명 is a bilingual Base44 Build-Off product demo that explores relationship discovery through the way people remember, converse, and express care rather than through demographic filters.

This repository belongs only to **Business 56 · Resonance / 공명**. It is not Business 25, Love Matchmaking, or an AI Revenue Lab registry application.

## Slice 2 product journey

```text
private Memory Cards
→ explicit ConsentRecord
→ deterministic ResonanceFingerprint
→ three explainable synthetic candidates
→ one MatchDecision with an explicitly simulated mutual state
```

The browser experience provides exactly three bounded private memory prompts. It never asks for legal names, addresses, employers, contact details, diagnoses, trauma disclosure, sexual history, or protected characteristics. Raw memory text remains in the owner’s editing surface and is not copied into candidate output.

## Durable Base44 resources

All private Entities allow create only for authenticated `user` and `admin` roles. Read, update, and delete are owner-scoped through Base44’s built-in `created_by_id` metadata.

- `MemoryCard` — one of three fixed prompts, 24–420 characters.
- `ConsentRecord` — explicit, initially unselected consent for exactly three card IDs.
- `ResonanceFingerprint` — five bounded structured dimensions with no raw memory text.
- `MatchDecision` — one synthetic candidate and either `interested_waiting` or `simulated_mutual`.
- `CapabilityProbe` — retained as secondary backend proof from Slice 1.

No private Entity uses `read: true`, public mutation, client-controlled owner fields, or a browser service-role path.

## Caller-scoped Functions

### `generate-fingerprint`

Authenticated JSON `POST` only. It accepts exactly three unique caller-owned `MemoryCard` IDs, one active caller-owned `ConsentRecord`, and a locale. It reads under caller permissions, deterministically creates or updates one bounded fingerprint for the consent record, and returns only structured output.

### `compute-matches`

Authenticated JSON `POST` only. It accepts one caller-owned fingerprint ID and deterministically scores three server-defined synthetic profiles. Ordering is stable by score and candidate ID. Each result includes a synthetic label, bounded score/tier, two or three shared signals, one difference, and a bounded explanation.

Neither Function uses service role, live AI, Agents, Integrations, secrets, or raw authentication material. Inaccessible and nonexistent resource IDs share the same unavailable error class.

## Visual and resilience contract

- English default with persistent Korean switch.
- Cinematic CSS/SVG visual language; no raster or stock romance images.
- Primary CTA visible in the initial `390×844` mobile viewport.
- Fingerprint and candidates visible as product results before technical evidence.
- Normal authenticated UI uses `Resonance member` / `공명 사용자`, not account email.
- Auth errors are shown only after real user-facing failures and stale notices clear on recovery.
- Reload restores owner-scoped durable steps.
- Mutation buttons disable while pending and in-flight guards prevent duplicate submission under React StrictMode.
- Visible focus, reduced motion, and horizontal-overflow protection remain enabled.

## Local commands

```bash
npm ci
npm run test:ci
npm run build
npm run dev
```

Tests are deterministic and credential-free. They do not deploy, push Base44 resources, call live AI, or require a Base44 token.

## Runtime validation boundary

The Web Implementation Developer does not deploy or claim browser runtime success. After Web CTO review, the Local Validator checks the exact Draft PR head against the existing Base44 app, including Auth, owner RLS, Function contracts, cross-user isolation, mobile/desktop evidence, retries, reload restoration, and duplicate-mutation behavior.
