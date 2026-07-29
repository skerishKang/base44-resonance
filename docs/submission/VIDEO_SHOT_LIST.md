# WatchTree Demo Video — Shot List

**Master:** `WatchTreeDemoMain` · 2:38 · 4,740 frames · 1920×1080 · 30 fps
**Capture rule:** Actual final footage comes only from the exact deployed Base44 Production release. Editorial cards and overlays may frame that footage but may not reconstruct product screens.

## Scene and clip table

| Scene | Time / frames | Required asset | Exact Production route/state to resolve during UAT | Capture action | Required visible proof | Truth at package time | Fallback | Final verified |
|---|---|---|---|---|---|---|---|---|
| S01 Hook | 0:00–0:12 / 0–359 | `video/public/clips/01-landing.webm` | `/`; settled signed-out landing | Slow cursor-free hold or restrained pan | WatchTree identity and the two product choices that actually exist in final Production | Landing baseline `VERIFIED_PRODUCTION`; tutorial choice `SOURCE_TARGET` | If tutorial choice is absent, use the real landing and revise narration/card; never add a fake CTA | `UNVERIFIED` |
| S02 Deliberate collection | 0:12–0:36 / 360–1,079 | `video/public/clips/02-url-entry.webm` | Exact final authenticated Production route/state discovered during UAT; do not infer PR #47 routes | Paste one public synthetic-fixture URL only after URL-entry UAT; leave private note blank | Deliberate addition; no automatic history; no OAuth/API-key dependency | `MERGED_NOT_DEPLOYED` | Record the real Production synthetic-demo path with persistent `SYNTHETIC FALLBACK`; canonical narration already covers both branches | `UNVERIFIED` |
| S03 Private tree | 0:36–1:00 / 1,080–1,799 | `video/public/clips/03-private-tree.webm` | Exact final authenticated Production tree state discovered during UAT | Reveal collection count, repeat tendency, time rhythm, sequence, and tree growth | Only supported signals from sanitized synthetic records; no private note or unsupported metadata | Baseline scope `VERIFIED_PRODUCTION`; final release pending | Remove any unavailable signal from both footage and narration; no annotated fake state | `UNVERIFIED` |
| S04 Synthetic match | 1:00–1:25 / 1,800–2,549 | `video/public/clips/04-synthetic-match.webm` | Exact final authenticated Production synthetic-match state discovered during UAT | Open one synthetic archetype and expand inspectable evidence | `Synthetic archetype`; deterministic evidence; no percentage; no real person | Baseline scope `VERIFIED_PRODUCTION`; final release pending | Use an actual Production seeded synthetic result only; otherwise remove the scene | `UNVERIFIED` |
| S05 Consent / simulated mutual | 1:25–1:48 / 2,550–3,239 | `video/public/clips/05-consent-mutual.webm` | Exact final authenticated Production consent state discovered during UAT | Select safe evidence; give explicit reveal consent; show simulated mutual | `Synthetic archetype`, `Simulated mutual`, `No real user contacted` remain readable | Baseline scope `VERIFIED_PRODUCTION`; final release pending | If all three labels are not visible, stop at consent and revise narration/SRT | `UNVERIFIED` |
| S06 Privacy lifecycle | 1:48–2:06 / 3,240–3,779 | `video/public/clips/06-delete.webm` | Exact final authenticated Production privacy state discovered during UAT | Exclude one record; toggle matching off; delete all; wait for restored empty state | Real empty state after completed bounded deletion | Baseline scope `VERIFIED_PRODUCTION`; final release pending | No fake fallback. A failed delete blocks capture | `UNVERIFIED` |
| S07 Base44 proof | 2:06–2:28 / 3,780–4,439 | `video/public/clips/07-base44-proof.webm` | Sanitized exact-release source/CI/Production evidence | Show Auth boundary, owner-scoped Entity/RLS evidence, caller-scoped Function evidence, CI, hosting/deploy provenance | `13 Entity schemas in source`; `13 Function sources`; Production baseline visibly separate from latest source | Scene asset `SOURCE_TARGET`; baseline may be `VERIFIED_PRODUCTION`; counts are labeled source inventory; Realtime stays `MERGED_NOT_DEPLOYED` | Public repository/CI proof labeled `SOURCE INVENTORY — NOT DEPLOYMENT PROOF` | `UNVERIFIED` |
| S08 Close | 2:28–2:38 / 4,440–4,739 | No clip; Remotion `ClosingCard` | N/A | Editorial card only | Reverified Production URL, public GitHub URL, product and event names | URL baseline `VERIFIED_PRODUCTION`; final exact release pending | Update and rerender if URL changes | `UNVERIFIED` |

Frame ranges are inclusive for review. Remotion uses contiguous half-open sequences internally.

## Recording order

Authentication must not appear in retained footage:

1. Run the Playwright helper with `--landing-only` for S01.
2. Run the helper normally for S02–S07. It uses one disposable login page for manual authentication, closes that page, deletes its transient Playwright video, then opens a separate authenticated capture page.
3. Use the saved manual marker JSON to trim the authenticated session into six clips.
4. Do not capture S08; it is an editorial closing card whose URL must be reverified.

## Per-shot framing

- Keep one primary action visible at a time.
- Use 100% browser zoom unless UAT documents a reason to change it.
- Keep the pointer away from private fields and disclosure labels.
- Remove dead time, login waiting, mistakes, loading stalls, and retries.
- Do not show browser chrome that contains identity, bookmarks, extensions, downloads, notifications, or local paths.
- Keep editorial `TruthBadge` labels readable but outside critical product controls.
- Never cover `Synthetic archetype`, `Simulated mutual`, or `No real user contacted`.

## Optional substitutions, not additions

| Material | Gate | Use rule |
|---|---|---|
| Realtime | Exact final Production deployment and authenticated UAT | May replace a few seconds inside S03 only. Do not extend the master. |
| PR #47 tutorial | Merged, deployed, localized, browser-verified, authenticated UAT | May supply the real S01 second choice or a portion of S02. Until then it remains `SOURCE_TARGET`. |

Product AI/LLM/Agent capability and File storage are `DO_NOT_SHOW` and have no shot allocation.

## Capture completion checklist

- [ ] Seven exact filenames exist locally and are not staged by Git.
- [ ] Every normalized clip is at least its expected duration, exactly 1920×1080, and exactly 30 fps.
- [ ] Every clip was recorded after the final deployed SHA was recorded.
- [ ] S02 truth resolution is `VERIFIED_PRODUCTION` or visibly `SYNTHETIC_FALLBACK`.
- [ ] S04 and S05 disclosure labels remain visible.
- [ ] S06 ends in the actual empty state.
- [ ] S07 distinguishes source inventory from Production proof.
- [ ] All `Final verified` cells remain `UNVERIFIED` until the runbook gates pass.
