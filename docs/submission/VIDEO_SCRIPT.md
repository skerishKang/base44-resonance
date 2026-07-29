# WatchTree Demo Video Script

**Product:** WatchTree by Resonance
**Master:** `WatchTreeDemoMain`
**Exact duration:** 2:38 (158 seconds / 4,740 frames)
**Format:** 1920×1080 · 30 fps · MP4 · H.264 · AAC
**Language:** English narration; Korean is an internal reference only
**Captions:** `docs/submission/watchtree-demo.en.srt`

The exact user-specified scene ranges total 2:38. This is the authoritative master timing: it stays inside the 2:00–2:45 output gate and the 2:20–2:40 narration target. Do not stretch it beyond 3:00.

The canonical narration is 276 words: about 105 words per minute overall, with scene-level rates from 88 to 140 words per minute. Record naturally and use the allocated silence rather than speeding up.

## Truth-status key

| Value | Meaning in this package |
|---|---|
| `VERIFIED_PRODUCTION` | Evidence exists for the current Production baseline. The final release must still be rechecked after deployment. |
| `MERGED_NOT_DEPLOYED` | Merged source exists, but it is not a Production claim. |
| `SOURCE_TARGET` | Intended latest-source or editorial target; show as live only after deployed UAT. |
| `OPTIONAL_IF_VERIFIED` | Omit unless exact final Production verification succeeds. |
| `DO_NOT_SHOW` | Excluded from the composition and footage. |

## State recorded at pre-production start

| Item | Status | Video rule |
|---|---|---|
| Public Production baseline URL `https://base44-resonance-40117c91.base44.app` | `VERIFIED_PRODUCTION` baseline locator | Reconfirm exact deployed SHA and authenticated behavior before capture. |
| Base44 Auth, owner-scoped Entities/RLS, caller-scoped Functions, hosting | `VERIFIED_PRODUCTION` baseline scope | Capture sanitized exact-release evidence only. |
| `add-watch-url-event` latest source | `MERGED_NOT_DEPLOYED` | Use live URL entry only after final deployed UAT; otherwise use the labeled synthetic fallback. |
| Realtime latest source | `MERGED_NOT_DEPLOYED` | Omit unless final Production UAT verifies it. It is not needed by the main cut. |
| Tutorial / PR #47 | `SOURCE_TARGET` | Do not present it as Production before deployment and UAT. |
| Product AI/LLM/Agent capability | `DO_NOT_SHOW` | Excluded. Deterministic matching is not AI. |
| File storage capability | `DO_NOT_SHOW` | Excluded. Video assets remain local and uncommitted. |

## Exact main narration

The English text in this table is the recording script and must match the SRT exactly. On-screen text is editorial; it must never cover a required synthetic/simulated disclosure in the actual footage.

| Time | Scene | English narration (exact) | 한국어 참고 번역 | Screen direction | Editorial on-screen text | Truth status | Fallback narration | Final verification |
|---|---|---|---|---|---|---|---|---|
| 0:00–0:12 | 1 — Hook | Your viewing history is more than a recommendation signal. It is a path through what held your attention. WatchTree turns links you choose into a private memory tree. | 시청 기록은 추천 신호 그 이상입니다. 무엇이 당신의 주의를 붙잡았는지 보여 주는 경로입니다. WatchTree는 당신이 선택한 링크를 private memory tree로 바꿉니다. | Exact Production landing inside `BrowserFrame`; title treatment; two product choices. | `Build my WatchTree` · `See Mina’s WatchTree story` | `VERIFIED_PRODUCTION` baseline; tutorial choice remains `SOURCE_TARGET` until verified | If the final landing lacks the tutorial choice: “WatchTree turns links you choose into a private memory tree, with a guided story prepared as a clearly labeled source target.” Re-record this cue and regenerate SRT. | `UNVERIFIED` |
| 0:12–0:36 | 2 — Deliberate collection | WatchTree never reads your YouTube account history. You choose every link that enters your private collection. This scene uses verified URL entry only after final Production UAT; otherwise it stays visibly synthetic. There is no YouTube OAuth, no YouTube API key, no automatic account access, and no metadata lookup. | WatchTree는 YouTube 계정 기록을 읽지 않습니다. private collection에 들어오는 모든 링크는 사용자가 직접 선택합니다. 이 장면은 final Production UAT 후 검증된 URL 입력만 사용하며, 그렇지 않으면 명확한 synthetic 표시를 유지합니다. YouTube OAuth, YouTube API 키, 자동 계정 접근, metadata 조회가 없습니다. | Paste a public synthetic-fixture URL only if the URL flow is verified. Never show login. Optional fields may be visible, but private note content stays blank. | `Chosen links only` · `No OAuth` · `No YouTube API key` · `No metadata lookup` | `MERGED_NOT_DEPLOYED` at package time | The canonical narration already covers both outcomes. If fallback is used, keep `SYNTHETIC FALLBACK · NO LIVE URL BEHAVIOR` persistent and resolve the local verification record accordingly. | `UNVERIFIED` |
| 0:36–1:00 | 3 — Private tree | As the collection grows, WatchTree shows its count, repeat tendency, time rhythm, and sequence. Every signal comes from records you provided. It does not invent unsupported metadata or turn your choices into an AI profile. | 컬렉션이 자라면 WatchTree는 개수, 반복 경향, 시간 리듬, 순서를 보여 줍니다. 모든 신호는 사용자가 제공한 기록에서 나옵니다. 지원되지 않는 metadata를 만들거나 선택을 AI profile로 바꾸지 않습니다. | Show actual count, repeat tendency, time rhythm, sequence, and tree growth from sanitized synthetic records. Do not invent creators, categories, duration, or verified labels. | `Count` · `Repeat` · `Rhythm` · `Sequence` | `VERIFIED_PRODUCTION` baseline scope; exact release recheck required | If any listed signal is absent, omit it from footage and re-record a narrower narration cue that names only visible supported signals. | `UNVERIFIED` |
| 1:00–1:25 | 4 — Synthetic match | WatchTree compares the private tree with clearly synthetic viewing archetypes, never real people. Matching is deterministic and explainable. You can inspect the evidence behind a result. There is no percentage, no soulmate score, and no hidden AI ranking. | WatchTree는 private tree를 실제 사람이 아닌 명확한 synthetic viewing archetype과 비교합니다. 매칭은 deterministic하고 설명 가능합니다. 결과의 근거를 확인할 수 있습니다. percentage, soulmate score, 숨겨진 AI ranking은 없습니다. | Open one actual synthetic archetype and its bounded evidence. Keep the synthetic label visible. Never display a percentage or real identity. | `Synthetic archetype` · `Deterministic` · `Inspectable evidence` | `VERIFIED_PRODUCTION` baseline scope | Use only an actual Production synthetic-demo result. If none is available, remove the match scene; do not fabricate a result. | `UNVERIFIED` |
| 1:25–1:48 | 5 — Consent and simulated mutual | You choose which evidence to reveal and give explicit consent. The result stays visibly labeled: Synthetic archetype. Simulated mutual. No real user contacted. It is a bounded demonstration of consent, not a claim that another person was reached. | 공개할 근거를 선택하고 명시적으로 동의합니다. 결과에는 Synthetic archetype, Simulated mutual, No real user contacted가 계속 표시됩니다. 이는 동의의 제한된 시연이지 다른 실제 사람에게 연락했다는 주장이 아닙니다. | Select safe evidence, grant reveal consent, then show the simulated mutual state. All three disclosure labels stay readable. | `Synthetic archetype` · `Simulated mutual` · `No real user contacted` | `VERIFIED_PRODUCTION` baseline scope | If any required label is missing in Production, do not show mutual state. End the scene on explicit consent and re-record a matching cue. | `UNVERIFIED` |
| 1:48–2:06 | 6 — Privacy lifecycle | Privacy continues through the whole lifecycle. Exclude a record, turn matching off, or delete everything and return to an empty state. Deletion is a product feature, not a footer promise. | 프라이버시는 전체 lifecycle에 이어집니다. 기록을 제외하고, matching을 끄거나, 모든 것을 삭제해 empty state로 돌아갈 수 있습니다. 삭제는 footer의 약속이 아니라 제품 기능입니다. | Show exclusion, matching toggle, delete-all confirmation, completion, and restored empty state. Use disposable synthetic data. | `Deletion is a product feature, not a footer promise.` | `VERIFIED_PRODUCTION` baseline scope | If deletion cannot be safely demonstrated, stop capture and fix UAT; do not replace the result with an editorial fake. | `UNVERIFIED` |
| 2:06–2:28 | 7 — Base44 proof | Base44 supplies Auth, owner-scoped Entities and row-level security, caller-scoped Deno Functions, runtime, hosting, and deployment authority. Current source contains thirteen Entity schemas and thirteen Function sources. Production proof remains separate from latest source until deployment and authenticated UAT. | Base44는 Auth, owner-scoped Entity와 row-level security, caller-scoped Deno Function, runtime, hosting, deployment authority를 제공합니다. 현재 source에는 Entity schema 13개와 Function source 13개가 있습니다. 배포와 authenticated UAT 전까지 Production proof와 latest source를 분리합니다. | Sanitized exact-release proof plus the editorial architecture overlay. Show source counts as source counts. Keep Production baseline and latest source visibly distinct. | `13 Entity schemas in source` · `13 Function sources` · `Production ≠ latest source until verified` | Scene asset `SOURCE_TARGET`; baseline capabilities may carry `VERIFIED_PRODUCTION`; counts must read `SOURCE INVENTORY — NOT DEPLOYMENT PROOF`; Realtime remains `MERGED_NOT_DEPLOYED` and is omitted unless verified | If sanitized backend proof is unavailable, use public repository/CI evidence with a `SOURCE INVENTORY — NOT DEPLOYMENT PROOF` label. | `UNVERIFIED` |
| 2:28–2:38 | 8 — Close | WatchTree by Resonance. Your memory, your rules. Built for the Base44 Dev Build-Off. The verified Production URL is on screen. | Resonance의 WatchTree. 당신의 기억, 당신의 규칙. Base44 Dev Build-Off를 위해 만들었습니다. 검증된 Production URL은 화면에 표시됩니다. | Editorial closing card with the reverified Production URL and public GitHub repository. | `WatchTree by Resonance` · Production URL · GitHub · `Built for Base44 Dev Build-Off` | URL baseline `VERIFIED_PRODUCTION`; exact final release `UNVERIFIED` until capture | If the Production URL changes, update the card, docs, verification record, and final render before upload. | `UNVERIFIED` |

## Optional material

Realtime and the PR #47 tutorial are not needed for the 2:38 main composition. They may replace—not extend—a scene only after exact Production deployment and authenticated UAT. Keep the final duration at 2:38 and regenerate narration/SRT if any cue changes.

## Final recording gate

Before changing any `UNVERIFIED` cell:

- record the exact `origin/main` and deployed full SHA;
- confirm the public Production URL and App ID;
- complete authenticated UAT using the dedicated synthetic account;
- decide URL flow: `VERIFIED_PRODUCTION` or visibly labeled `SYNTHETIC_FALLBACK`;
- confirm every visible claim against actual frames;
- confirm captions against the final narration waveform;
- confirm all privacy checklist items frame by frame.

This pre-production package performs none of those final-release actions.
