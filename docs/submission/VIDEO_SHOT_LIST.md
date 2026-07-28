# WatchTree Demo Video — Shot List

**Target duration:** 2:15–2:45
**Resolution:** 1920×1080 · 30 fps · MP4 H.264/AAC
**All shots desktop unless noted.**

## Truth-status key

| Value | Meaning |
|-------|---------|
| VERIFIED_PRODUCTION | Confirmed live in authenticated Production UAT |
| MERGED_NOT_DEPLOYED | Merged to main; not yet deployed |
| SOURCE_TARGET | In source; deployment pending |
| OPTIONAL_IF_VERIFIED | Include only if verified at capture time |
| DO_NOT_SHOW | Must not appear |

---

## Shot table

| Shot ID | Time | Page / State | User Action | Expected Visual | Narration (abbrev.) | Caption Range | Desktop/Mobile | Data Fixture | Privacy Risk | Fallback | Final Verification |
|---------|------|-------------|-------------|-----------------|---------------------|---------------|----------------|--------------|--------------|----------|--------------------|
| S01 | 0:00–0:12 | Landing / hero | None (static or slow pan) | WatchTree hero, private tree visual, product name | Hook: viewing history ≠ surveillance profile | 0:00–0:12 | Desktop | None | None | Static title card if hero unavailable | UNVERIFIED |
| S02a | 0:12–0:20 | Authenticated entry | Navigate to app after login | App shell, user avatar (sanitized) | "WatchTree never reads your YouTube account" | 0:12–0:20 | Desktop | Sanitized test account | Email must be sanitized | Skip to S02b if auth slow | UNVERIFIED |
| S02b | 0:20–0:38 | URL collection form | Paste public YouTube URL; optional watched date, rewatch, note | Form fields, validation success, stored record | "You paste a public YouTube URL… only because you chose it" | 0:20–0:38 | Desktop | Public YouTube URL (no personal history) | No personal URLs; no autofill | Synthetic-demo fallback: pre-seeded collection with `SYNTHETIC DEMO` label | UNVERIFIED |
| S03 | 0:38–1:03 | Tree view | Scroll tree; hover signals | Event count, repeat tendency, time rhythm, tree growth; unverified label badge | "As your collection grows… reflects what you chose to remember" | 0:38–1:03 | Desktop | Seeded collection (≥5 records) | No private note content visible | Annotated screenshot fallback | UNVERIFIED |
| S04 | 1:03–1:28 | Matching result | View top candidate; expand evidence | Synthetic archetype label, bounded evidence list, signal state | "WatchTree compares your records against clearly synthetic archetypes" | 1:03–1:28 | Desktop | Seeded collection with match result | No real-person claim | Pre-seeded synthetic result with `SYNTHETIC DEMO` label | UNVERIFIED |
| S05a | 1:28–1:38 | Evidence selection | Select evidence tokens | Evidence token checkboxes, selection state | "Before any result is revealed, you select which evidence to share" | 1:28–1:38 | Desktop | Same seeded collection | No private note content | Annotated screenshot fallback | UNVERIFIED |
| S05b | 1:38–1:48 | Consent + simulated mutual | Toggle reveal consent; view mutual state | Consent toggle, `SIMULATED` label on mutual state | "The mutual state shown here is simulated" | 1:38–1:48 | Desktop | Same seeded collection | Simulated label must be visible | Annotated screenshot fallback | UNVERIFIED |
| S06a | 1:48–1:56 | Privacy controls | Toggle matching off; exclude one record | Matching-off state, excluded record indicator | "You can turn matching off, exclude specific records" | 1:48–1:56 | Desktop | Same seeded collection | None | None required | UNVERIFIED |
| S06b | 1:56–2:06 | Delete all | Click delete all; confirm; view empty state | Confirmation dialog, deletion progress, clean empty state | "After deletion, WatchTree restores a clean empty state" | 1:56–2:06 | Desktop | Same seeded collection | None | None required | UNVERIFIED |
| S07 | 2:06–2:28 | Architecture / proof | Slow scroll over sanitized views | Entity schema list, `created_by_id` RLS, Deno Function entrypoints, CI green badge | "Base44 is not only where WatchTree is hosted" | 2:06–2:28 | Desktop | None (static graphics or sanitized repo) | No secrets, tokens, HMAC, cookies | Sanitized local git log + test output screenshot | UNVERIFIED |
| S08 | 2:28–2:40 | Ending card | None (static) | Product name, live URL, GitHub repo, Build-Off label | "WatchTree by Resonance. Built for the Base44 Dev Build-Off." | 2:28–2:40 | Desktop | None | None | None required | UNVERIFIED |

---

## Required shot checklist

- [ ] Signed-out opening (S01)
- [ ] Authenticated entry (S02a)
- [ ] Deliberate link collection OR synthetic fallback (S02b)
- [ ] Tree (S03)
- [ ] Match (S04)
- [ ] Evidence (S05a)
- [ ] Consent (S05b)
- [ ] Simulated mutual (S05b)
- [ ] Delete (S06b)
- [ ] Base44 proof (S07)
- [ ] Ending card (S08)

## Notes

- All `Final Verification` fields are `UNVERIFIED` until authenticated Production UAT is complete.
- URL collection shots (S02b) require `add-watch-url-event` to be deployed. If not deployed at capture time, use synthetic-demo fallback.
- Realtime refresh: OPTIONAL_IF_VERIFIED — add a short shot only if Issue #41 is verified at capture time.
- AI Agent and File Storage: DO_NOT_SHOW.
