# WatchTree Demo Video — Shot List

**Target duration:** 2:15–2:45
**Resolution:** 1920×1080 · 30 fps · MP4 H.264/AAC
**All shots desktop unless noted.**

---

## Truth-status key

| Value | Meaning |
|-------|---------|
| VERIFIED_PRODUCTION | Confirmed live in authenticated Production UAT |
| MERGED_NOT_DEPLOYED | Merged to main; not yet deployed |
| SOURCE_TARGET | In source; deployment pending |
| OPTIONAL_IF_VERIFIED | Include only if verified at capture time |
| DO_NOT_SHOW | Must not appear |

## Shot table

| Shot ID | Time Range | Route / State | Login State | Action | Expected Visual | Narration (abbrev.) | Caption Cue | Desktop/Mobile | Data Fixture | Privacy Risk | Truth Status | Fallback | Final Verified |
|---------|-----------|---------------|-------------|--------|-----------------|---------------------|-------------|----------------|--------------|--------------|--------------|----------|----------------|
| S01 | 0:00–0:12 | `/` — Landing hero | Signed-out | None (static or slow pan) | WatchTree hero, private tree visual, product name | "Your viewing history can say something about how you remember…" | Cue 1–3 | Desktop | None | None | VERIFIED_PRODUCTION | Static title card: `WatchTree by Resonance — Your memory. Your rules.` | UNVERIFIED |
| S02a | 0:12–0:20 | `/` → Auth → App shell | Signed-out → Authenticated | Click "Enter WatchTree" → Base44 Auth sign-in → navigate to app | Auth form, app shell after login, sanitized user indicator | "WatchTree never reads your YouTube account…" | Cue 4–5 | Desktop | Sanitized test account | Email must be sanitized; no password visible | VERIFIED_PRODUCTION (Auth) | Skip to S02b synthetic fallback if auth unreachable | UNVERIFIED |
| S02b | 0:20–0:38 | URL collection form | Authenticated | Paste public YouTube URL; optional: watched date, rewatch, private note | Form fields, validation success, record stored in collection | "You paste a public YouTube URL… only because you chose it" | Cue 6–9 | Desktop | Public YouTube URL (no personal history) | No personal URLs; no autofill; no clipboard popup | SOURCE_TARGET — URL collection merged, deployment pending | Synthetic-demo fallback: pre-seeded collection with `SYNTHETIC DEMO — URL collection pending deployment` label | UNVERIFIED |
| S03 | 0:38–1:03 | `/watchtree` — Tree view | Authenticated | Scroll tree; hover signals | Event count, repeat tendency, time rhythm, tree growth; unverified label badge | "As your collection grows… reflects what you chose to remember" | Cue 10–14 | Desktop | Seeded collection (≥5 records) | No private note content visible | VERIFIED_PRODUCTION (signals); unverified badge: SOURCE_TARGET | Annotated screenshot: `Annotated — live capture pending` | UNVERIFIED |
| S04 | 1:03–1:28 | Matching result | Authenticated | View top candidate; expand evidence | Synthetic archetype label, bounded evidence list, signal state | "WatchTree compares your records against clearly synthetic viewing archetypes…" | Cue 15–20 | Desktop | Seeded collection with match result | No real-person claim; synthetic labels visible | VERIFIED_PRODUCTION (matching, synthetic labels) | Pre-seeded result with `SYNTHETIC DEMO` label | UNVERIFIED |
| S05a | 1:28–1:38 | Evidence selection | Authenticated | Select evidence checkboxes | Evidence token checkboxes, selection state | "Before any result is revealed, you select which evidence to share…" | Cue 21–22 | Desktop | Same seeded collection | No private note content | VERIFIED_PRODUCTION | Annotated screenshot fallback | UNVERIFIED |
| S05b | 1:38–1:48 | Consent + Simulated mutual | Authenticated | Toggle reveal consent; view mutual state | Consent toggle, `SIMULATED` label on mutual state | "The mutual state shown here is simulated… not another real user" | Cue 23–24 | Desktop | Same seeded collection | Simulated label must be visible | VERIFIED_PRODUCTION (consent, simulated label) | Annotated screenshot with visible `SIMULATED` label | UNVERIFIED |
| S06a | 1:48–1:56 | Privacy controls | Authenticated | Toggle matching off; exclude one record | Matching-off state, excluded record indicator | "You can turn matching off, exclude specific records…" | Cue 25–26 | Desktop | Same seeded collection | None | VERIFIED_PRODUCTION | None required | UNVERIFIED |
| S06b | 1:56–2:06 | Delete all + empty state | Authenticated | Click delete all → confirm → view empty state | Confirmation dialog, deletion progress, clean empty state | "After deletion, WatchTree restores a clean empty state" | Cue 27–28 | Desktop | Same seeded collection | None | VERIFIED_PRODUCTION | None required | UNVERIFIED |
| S07 | 2:06–2:20/2:40 | Architecture proof | Authenticated (or static) | Scroll/pan over sanitized views | Entity schema list, `created_by_id` RLS, Deno Function entrypoints, CI green badge | "Base44 is not only where WatchTree is hosted…" | Cue 29–36 | Desktop | None (static graphics or sanitized repo) | No secrets, tokens, HMAC, cookies, env vars | VERIFIED_PRODUCTION (Auth, Entities, hosting); Function count: 12 VERIFIED / 13th SOURCE_TARGET | Sanitized local `git log` + test output screenshot | UNVERIFIED |
| S08 | 2:20/2:40–end | Closing card | N/A | None (static) | Product name, live URL, GitHub repo, Base44 Dev Build-Off label | "WatchTree by Resonance. Built for the Base44 Dev Build-Off." | Cue 37 | Desktop | None | None | VERIFIED_PRODUCTION | None required | UNVERIFIED |

## Required shot checklist

- [ ] S01 — Signed-out opening / hero
- [ ] S02a — Authenticated entry
- [ ] S02b — Deliberate URL collection OR synthetic fallback
- [ ] S03 — Private WatchTree
- [ ] S04 — Synthetic archetype matching
- [ ] S05a — Evidence selection
- [ ] S05b — Consent + simulated mutual
- [ ] S06a — Matching off / exclusion
- [ ] S06b — Delete-all + empty state
- [ ] S07 — Base44 technical proof
- [ ] S08 — Closing card

## Conditional shots

| Shot ID | Condition | Time Budget |
|---------|-----------|-------------|
| S07b — Realtime demo | Include only if Issue #41 verified in Production UAT | +8 s |
| S07c — Tutorial walkthrough | Include only if PR #47 deployed to Production | +6 s |

## Notes

- All `Final Verified` fields are `UNVERIFIED` until authenticated Production UAT is complete.
- URL collection (S02b) requires `add-watch-url-event` deployed. If not, use synthetic-demo fallback.
- Realtime (S07b): OPTIONAL_IF_VERIFIED. Do not show undeployed Realtime.
- Tutorial (S07c): OPTIONAL_IF_VERIFIED. PR #47 is Draft — do not claim as deployed.
- AI Agent and File Storage: DO_NOT_SHOW throughout.
